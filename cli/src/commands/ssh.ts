import { dockerConfig } from "../config.ts"
import { validateDockerAndContainer, withSpinner } from "../helpers/commands.ts"
import { Command } from "commander"

export function createSshCommand() {
  return new Command()
    .command("ssh")
    .description("Connect to the Kolo container shell")
    .action(
      withSpinner(
        "Connecting to container...",
        async (spinner) => {
          await validateDockerAndContainer(spinner)

          spinner.stop()
          // Using direct process.spawn for interactive shell session
          const { spawn } = await import("node:child_process")
          spawn(
            "docker",
            ["exec", "-it", dockerConfig.containerName, "/bin/bash"],
            {
              stdio: "inherit",
            },
          )
        },
        "Failed to connect",
      ),
    )
}
