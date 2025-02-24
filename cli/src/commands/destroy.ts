import { style } from "../colors.ts"
import { destroyContainer } from "../docker.ts"
import { CommandOptions } from "../types.ts"
import Table from "cli-table3"
import { Command } from "commander"
import inquirer from "inquirer"
import process from "node:process"
import ora from "ora"

export function createDestroyCommand() {
  return new Command()
    .command("destroy")
    .description("Remove Kolo components (container, volume, and/or image)")
    .option("-f, --force", "skip confirmation prompt", false)
    .option("-c, --container", "remove container", false)
    .option("-v, --volume", "remove volume", false)
    .option("-i, --image", "remove image", false)
    .option("-a, --all", "remove all components", false)
    .action(async (options: CommandOptions) => {
      const hasSpecificOptions =
        options.container || options.volume || options.image
      const destroyOptions = {
        container: options.all || (!hasSpecificOptions && !options.all),
        volume: options.all || options.volume,
        image: options.all || options.image,
      }

      console.log(style.title("\n Components to be removed:"))
      const componentsTable = new Table({
        head: [style.title("Component"), style.title("Will be removed")],
      })

      componentsTable.push(
        [
          "Container",
          destroyOptions.container ? style.error("Yes") : style.secondary("No"),
        ],
        [
          "Volume",
          destroyOptions.volume ? style.error("Yes") : style.secondary("No"),
        ],
        [
          "Image",
          destroyOptions.image ? style.error("Yes") : style.secondary("No"),
        ],
      )

      console.log(componentsTable.toString())

      if (!options.force) {
        console.log(style.warning("\n⚠️  Warning:"))
        console.log(style.error("  • This action cannot be undone"))
        console.log(
          style.error(
            "  • All selected components will be permanently removed",
          ),
        )

        const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
          {
            type: "confirm",
            name: "confirm",
            message: "Do you want to proceed with the removal?",
            default: false,
          },
        ])

        if (!confirm) {
          console.log(style.secondary("\nOperation cancelled"))
          process.exit(0)
        }
      }

      const spinner = ora("Destroying Kolo resources...").start()
      try {
        await destroyContainer(destroyOptions)
        spinner.succeed("Successfully removed selected Kolo components")

        const summaryTable = new Table({
          head: [style.title("Component"), style.title("Status")],
        })

        if (destroyOptions.container)
          summaryTable.push(["Container", style.success("Removed")])
        if (destroyOptions.volume)
          summaryTable.push(["Volume", style.success("Removed")])
        if (destroyOptions.image)
          summaryTable.push(["Image", style.success("Removed")])

        console.log("\nDestruction summary:")
        console.log(summaryTable.toString())
      } catch (error) {
        spinner.fail("Failed to destroy Kolo resources")
        console.error(
          style.error("Error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
