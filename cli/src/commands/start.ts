import { style } from "../colors.ts"
import { startContainer, containerServices } from "../docker.ts"
import { validateDockerAndContainer, withSpinner } from "../helpers/commands.ts"
import { displayHealthCheck } from "../helpers/health.ts"
import Table from "cli-table3"
import { Command } from "commander"
import terminalLink from "terminal-link"

export function createStartCommand() {
  return new Command()
    .command("start")
    .description("Start the Kolo container")
    .action(
      withSpinner(
        "Starting container...",
        async (spinner) => {
          await validateDockerAndContainer(spinner)

          await startContainer()
          spinner.succeed("Container started successfully")

          console.log(style.title("\n Available services:"))
          const services = await containerServices()
          const servicesTable = new Table()

          services.forEach((service) => {
            servicesTable.push({
              [service.name]: terminalLink.isSupported
                ? style.path(terminalLink(service.url, service.url))
                : style.path(service.url),
            })
          })

          console.log(servicesTable.toString())
          await displayHealthCheck()
        },
        "Failed to start container",
      ),
    )
}
