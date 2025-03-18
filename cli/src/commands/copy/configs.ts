import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import { copyDir } from "../../helpers/copy.ts"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"

export function createCopyConfigsCommand() {
  return new Command()
    .command("copy:configs")
    .description("Copy configuration files to the container")
    .option(
      "-s, --source <path>",
      "Source directory containing config files",
      "./torchtune/",
    )
    .option(
      "-d, --destination <path>",
      "Destination path in the container",
      "/app/",
    )
    .option("-c, --clear", "Clear destination directory before copying", false)
    .action(async (options) => {
      const spinner = ora("Copying configuration files...").start()

      try {
        const containerName = dockerConfig.containerName

        await copyDir(
          spinner,
          options.source,
          containerName,
          options.destination,
          options.clear,
        )

        spinner.succeed(
          `Successfully copied configuration files to ${options.destination}`,
        )
      } catch (error) {
        spinner.fail("Failed to copy configuration files")
        console.error(
          style.error("Error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
