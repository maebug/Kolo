import { style } from "../colors.ts"
import { convertToTrainingDataset, saveTrainingDataset } from "../converter.ts"
import { CommandOptions } from "../types.ts"
import { validateSourceFile } from "../validator.ts"
import { Command } from "commander"
import inquirer from "inquirer"
import { readFileSync, existsSync } from "node:fs"
import process from "node:process"
import ora from "ora"

export function createConvertCommand() {
  return new Command()
    .command("convert")
    .description("Convert a source file into a training dataset format")
    .argument("<source>", "path to the source file")
    .argument("<destination>", "path where the converted file will be saved")
    .option("-f, --force", "overwrite destination file if it exists", false)
    .action(
      async (source: string, destination: string, options: CommandOptions) => {
        try {
          const validateSpinner = ora("Validating source file...").start()
          const validation = validateSourceFile(source)

          if (!validation.valid) {
            validateSpinner.fail("Validation failed")
            console.error(
              style.error(validation.error ?? "Unknown validation error"),
            )
            process.exit(1)
          }
          validateSpinner.succeed("Source file validated")

          if (existsSync(destination) && !options.force) {
            const { confirmOverwrite } = await inquirer.prompt<{
              confirmOverwrite: boolean
            }>([
              {
                type: "confirm",
                name: "confirmOverwrite",
                message: `File ${destination} already exists. Do you want to overwrite it?`,
                default: false,
              },
            ])

            if (!confirmOverwrite) {
              console.error(style.error("Operation cancelled by user"))
              process.exit(1)
            }
          }

          const convertSpinner = ora("Converting file...").start()
          const sourceData = JSON.parse(readFileSync(source, "utf-8"))
          const dataset = convertToTrainingDataset(sourceData)
          convertSpinner.succeed("File converted")

          const saveSpinner = ora("Saving training dataset...").start()
          saveTrainingDataset(dataset, destination)
          saveSpinner.succeed("Training dataset saved")

          console.log(
            style.success(
              `Successfully converted ${style.path(source)} to ${style.path(destination)}`,
            ),
          )
        } catch (error) {
          ora().fail("Operation failed")
          console.error(
            style.error("Conversion error:"),
            error instanceof Error ? error.message : String(error),
          )
          process.exit(1)
        }
      },
    )
}
