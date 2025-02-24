import { style } from "../colors.ts"
import { stopContainer } from "../docker.ts"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"

export function createStopCommand() {
  return new Command()
    .command("stop")
    .description("Stop the Kolo container")
    .action(async () => {
      const spinner = ora("Stopping container...").start()
      try {
        await stopContainer()
        spinner.succeed("Container stopped successfully")
      } catch (error) {
        spinner.fail("Failed to stop container")
        console.error(
          style.error("Error stopping container:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
