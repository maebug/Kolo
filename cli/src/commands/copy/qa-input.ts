import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import { copyDir } from "../../helpers/copy.ts"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"

export function createCopyQaInputCommand() {
  return new Command()
    .command("copy:qa-input")
    .description("Copy QA generation input files to the container")
    .argument("<sourceDir>", "Source directory containing input files")
    .option(
      "-d, --destination <path>",
      "Destination path in the container",
      "/var/kolo_data/qa_generation_input",
    )
    .option("-c, --clear", "Clear destination directory before copying", true)
    .action(async (sourceDir, options) => {
      const spinner = ora("Copying QA input files...").start()

      try {
        const containerName = dockerConfig.containerName
        const destinationPath = options.destination
        const clearDestination = options.clear

        await copyDir(
          spinner,
          sourceDir,
          containerName,
          destinationPath,
          clearDestination,
        )

        spinner.succeed(
          `Successfully copied QA input files to ${destinationPath}`,
        )
      } catch (error) {
        spinner.fail("Failed to copy QA input files")
        console.error(
          style.error("Error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
