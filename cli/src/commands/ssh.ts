import { style } from "../colors.ts"
import { dockerConfig } from "../config.ts"
import { checkContainerExists } from "../docker.ts"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"

export function createSshCommand() {
  return new Command()
    .command("ssh")
    .description("Connect to the Kolo container shell")
    .action(async () => {
      const spinner = ora("Connecting to container...").start()
      try {
        const exists = await checkContainerExists()
        if (!exists) {
          spinner.fail("Container not found")
          console.error(
            style.error(
              "The Kolo container does not exist. Please run 'kolo init' first.",
            ),
          )
          process.exit(1)
        }

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
      } catch (error) {
        spinner.fail("Failed to connect")
        console.error(
          style.error("Error connecting to container:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
