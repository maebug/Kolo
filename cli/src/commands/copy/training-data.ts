import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import { copyToContainer, executeInContainer } from "../../docker.ts"
import { Command } from "commander"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import process from "node:process"
import ora from "ora"

export function createCopyTrainingDataCommand() {
  return new Command()
    .command("copy:training-data")
    .description("Copy a training data file to the container and convert it")
    .argument("<sourcePath>", "Local path to the training data file (.jsonl)")
    .option(
      "-d, --destination <name>",
      "Destination filename inside container",
      "data.jsonl",
    )
    .action(async (sourcePath, options) => {
      const spinner = ora("Copying training data...").start()

      try {
        // Check if the file exists locally
        if (!existsSync(sourcePath)) {
          spinner.fail(`File does not exist: ${sourcePath}`)
          process.exit(1)
        }

        const containerName = dockerConfig.containerName
        const destinationFile = options.destination
        const containerDestPath = `/app/${destinationFile}`

        // Copy file to container
        spinner.text = style.primary(
          `Copying ${sourcePath} to container at ${containerDestPath}...`,
        )

        const sourceFullPath = resolve(sourcePath)
        await copyToContainer(sourceFullPath, containerName, containerDestPath)

        spinner.succeed(`File copied successfully as ${destinationFile}`)
        spinner.start("Converting JSONL to JSON format...")

        // Run conversion script in container
        const jsonOutputFile = "data.json"
        const command = `source /opt/conda/bin/activate kolo_env && python /app/convert_jsonl_to_json.py '${containerDestPath}' '/app/${jsonOutputFile}'`

        await executeInContainer(containerName, command)

        spinner.succeed(
          `Conversion successful! File created as ${jsonOutputFile} in the container.`,
        )
      } catch (error) {
        spinner.fail("Operation failed")
        console.error(
          style.error("Error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
