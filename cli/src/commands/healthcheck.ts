import { style } from "../colors.ts"
import { checkContainerExists } from "../docker.ts"
import { displayHealthCheck } from "../helpers/health.ts"
import { Command } from "commander"
import process from "node:process"

export function createHealthcheckCommand() {
  return new Command()
    .command("healthcheck")
    .description("Check the health of Kolo services")
    .action(async () => {
      try {
        const exists = await checkContainerExists()
        if (!exists) {
          console.error(
            style.error(
              "The Kolo container does not exist. Please run 'kolo init' first to initialize Kolo.",
            ),
          )
          process.exit(1)
        }

        await displayHealthCheck()
      } catch (error) {
        console.error(
          style.error("Error checking services:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
