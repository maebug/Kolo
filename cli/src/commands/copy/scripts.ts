import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import { copyDir } from "../../helpers/copy.ts"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"

export function createCopyScriptsCommand() {
  return new Command()
    .command("copy:scripts")
    .description("Copy scripts directory to the container")
    .option(
      "-s, --source <path>",
      "Source directory path containing scripts",
      "./scripts/",
    )
    .option(
      "-d, --destination <path>",
      "Destination directory in the container",
      "/app/",
    )
    .option("-c, --clear", "Clear destination directory before copying", false)
    .action(async (options) => {
      const spinner = ora("Copying scripts...").start()

      try {
        const containerName = dockerConfig.containerName

        await copyDir(
          spinner,
          options.source,
          containerName,
          options.destination,
          options.clear,
        )

        spinner.succeed(`Successfully copied scripts to ${options.destination}`)
      } catch (error) {
        spinner.fail("Failed to copy scripts")
        console.error(
          style.error("Error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
