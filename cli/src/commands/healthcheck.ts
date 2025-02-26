import { validateDockerAndContainer, withSpinner } from "../helpers/commands.ts"
import { displayHealthCheck } from "../helpers/health.ts"
import { Command } from "commander"

export function createHealthcheckCommand() {
  return new Command()
    .command("healthcheck")
    .description("Check the health of Kolo services")
    .action(
      withSpinner(
        "Checking container...",
        async (spinner) => {
          await validateDockerAndContainer(spinner)
          spinner.succeed("Container found")
          await displayHealthCheck()
        },
        "Check failed",
      ),
    )
}
