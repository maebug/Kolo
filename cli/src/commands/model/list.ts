import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import {
  validateDockerAndContainer,
  withSpinner,
} from "../../helpers/commands.ts"
import { Command } from "commander"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

export function createModelListCommand() {
  return new Command()
    .name("model:list")
    .alias("model:ls")
    .description("List available fine-tuned models and Ollama models")
    .action(() =>
      withSpinner(
        "Checking container status...",
        async (spinner) => {
          // Validate that Docker is available and container is running
          await validateDockerAndContainer(spinner)

          // Define the target directories inside the container
          const targetDirectories = [
            "/var/kolo_data/torchtune",
            "/var/kolo_data/unsloth",
          ]

          // Temporarily pause the spinner to display output clearly
          spinner.stop()

          // List models in each directory
          for (const dir of targetDirectories) {
            console.log(style.primary(`\nModel folders in ${dir}`))

            try {
              // Build the command to allow shell globbing and suppress error messages if no folders are found
              const cmd = `docker exec ${dockerConfig.containerName} sh -c "ls -d ${dir}/*/ 2>/dev/null || true"`
              const { stdout } = await execAsync(cmd)

              if (stdout.trim().length === 0) {
                console.log(style.secondary("No models found"))
              } else {
                console.log(style.secondary(stdout))
              }
            } catch (error) {
              console.error(
                style.error(
                  `An exception occurred while listing folders in ${dir}: ${error instanceof Error ? error.message : String(error)}`,
                ),
              )
            }

            console.log(style.tertiary("-------------------------------------"))
          }

          // List installed models in Ollama
          console.log(style.primary("\nListing installed models in Ollama:"))
          try {
            const cmd = `docker exec ${dockerConfig.containerName} sh -c "ollama list"`
            const { stdout } = await execAsync(cmd)

            if (stdout.trim().length === 0) {
              console.log(
                style.secondary(
                  "No models installed or no output from ollama list.",
                ),
              )
            } else {
              console.log(style.secondary(stdout))
            }
          } catch (error) {
            console.error(
              style.error(
                `An exception occurred while listing installed models in Ollama: ${error instanceof Error ? error.message : String(error)}`,
              ),
            )
          }

          // Mark the operation as complete without showing the spinner again
          spinner.text = ""
          spinner.succeed("Models listed successfully!")
        },
        "Failed to list models",
      )(),
    )
}
