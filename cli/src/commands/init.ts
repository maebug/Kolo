import { style } from "../colors.ts"
import { initContainer, checkComponents, containerServices } from "../docker.ts"
import { displayHealthCheck } from "../helpers/health.ts"
import { CommandOptions } from "../types.ts"
import Table from "cli-table3"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"
import terminalLink from "terminal-link"

export function createInitCommand() {
  return new Command()
    .command("init")
    .description("Initialize and start the Kolo container")
    .option("-v, --verbose", "display verbose output", false)
    .action(async (options: CommandOptions) => {
      const components = await checkComponents()

      console.log(style.title(" Detected Kolo components:"))
      const componentsTable = new Table({
        head: [style.title("Component"), style.title("Exists")],
      })

      componentsTable.push(
        [
          "Container",
          components.container ? style.success("true") : style.error("false"),
        ],
        [
          "Volume",
          components.volume ? style.success("true") : style.error("false"),
        ],
        [
          "Image",
          components.image ? style.success("true") : style.error("false"),
        ],
      )

      console.log(componentsTable.toString())

      const spinner = ora(
        "Initializing container, this may take a while...",
      ).start()

      try {
        const result = await initContainer()
        spinner.succeed("Kolo initialized successfully!")

        console.log(style.title(" Kolo details:"))
        const services = await containerServices()
        const setupTable = new Table()

        setupTable.push(
          {
            "Docker version": style.secondary(
              result.dockerStatus.version || "",
            ),
          },
          {
            "Image status": style.secondary(
              result.build.imageExisted
                ? `Using existing image ${result.build.imageName}`
                : `Built new image ${result.build.imageName}`,
            ),
          },
          { Volume: style.secondary(result.volume.name) },
          { "Container name": style.secondary(result.container.name) },
        )

        services.forEach((service) => {
          setupTable.push({
            [service.name]: terminalLink.isSupported
              ? style.path(terminalLink(service.url, service.url))
              : style.path(service.url),
          })
        })

        console.log(setupTable.toString())

        if (options.verbose) {
          if (!result.build.imageExisted && result.build.buildOutput) {
            console.log(style.primary("Build output:"))
            console.log(style.secondary(result.build.buildOutput))
          }
          console.log(style.primary("Volume creation output:"))
          console.log(style.secondary(result.volume.output))
          console.log(style.primary("Container creation output:"))
          console.log(style.secondary(result.container.output))
        }

        await displayHealthCheck("Performing initial health check...")
      } catch (error) {
        spinner.fail("Failed to initialize container")
        console.error(
          style.error("Error initializing container:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
