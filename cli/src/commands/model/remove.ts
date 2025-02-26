import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import {
  validateDockerAndContainer,
  withSpinner,
} from "../../helpers/commands.ts"
import { Command } from "commander"
import inquirer from "inquirer"

export function createModelRemoveCommand() {
  return new Command()
    .name("model:remove")
    .alias("model:delete")
    .alias("model:uninstall")
    .description("Remove a model directory from the Kolo container")
    .requiredOption(
      "-d, --directory <folder>",
      "The subdirectory to remove under the tool folder",
    )
    .requiredOption(
      "-t, --tool <source>",
      "The tool directory (unsloth or torchtune)",
      (value) => {
        if (value !== "torchtune" && value !== "unsloth") {
          throw new Error("Tool must be either 'torchtune' or 'unsloth'")
        }
        return value
      },
    )
    .action((options) =>
      withSpinner(
        "Checking container status...",
        async (spinner) => {
          // Validate that Docker is available and container is running
          await validateDockerAndContainer(spinner)

          const { directory, tool } = options

          // Full path used for container operations
          const fullPath = `/var/kolo_data/${tool}/${directory}`

          // Confirmation path that the user must type
          const confirmPath = `/${tool}/${directory}`

          spinner.text = "Checking if directory exists..."

          // Check if the directory exists inside the container
          const { exec } = await import("node:child_process")

          const dirExists = await new Promise<boolean>((resolve) => {
            exec(
              `docker exec ${dockerConfig.containerName} sh -c "if [ -d '${fullPath}' ]; then echo 'exists'; else echo 'not_exists'; fi"`,
              (error, stdout) => {
                if (error || stdout.trim() !== "exists") {
                  resolve(false)
                } else {
                  resolve(true)
                }
              },
            )
          })

          if (!dirExists) {
            spinner.fail(
              `Directory '${fullPath}' does not exist inside container.`,
            )
            throw new Error(
              `Directory '${fullPath}' does not exist inside container.`,
            )
          }

          // Stop spinner during user interaction
          spinner.stop()

          // Warning and confirmation
          console.log(
            style.warning("WARNING:"),
            `You are about to permanently delete the directory '${fullPath}' inside container.`,
          )
          console.log(
            style.info(
              "To confirm deletion, you MUST type EXACTLY the following directory path:",
            ),
          )
          console.log(style.command(`\t${confirmPath}`))

          const { confirmation } = await inquirer.prompt([
            {
              type: "input",
              name: "confirmation",
              message: "Type the directory path to confirm deletion:",
            },
          ])

          if (confirmation !== confirmPath) {
            throw new Error(
              `Confirmation failed. The text you entered does not match '${confirmPath}'. Aborting.`,
            )
          }

          // Restart spinner for deletion process
          spinner.text = `Deleting '${fullPath}'...`
          spinner.start()

          // Execute the remove command inside the container
          await new Promise<void>((resolve, reject) => {
            exec(
              `docker exec ${dockerConfig.containerName} rm -rf "${fullPath}"`,
              (error) => {
                if (error) {
                  reject(
                    new Error(`Failed to remove directory: ${error.message}`),
                  )
                  return
                }
                resolve()
              },
            )
          })

          spinner.succeed(`Directory '${fullPath}' removed successfully!`)
        },
        "Failed to remove directory",
      )(),
    )
}
