import { style } from "../colors.ts"
import {
  checkContainerExists,
  startContainer,
  containerServices,
} from "../docker.ts"
import { displayHealthCheck } from "../helpers/health.ts"
import Table from "cli-table3"
import { Command } from "commander"
import process from "node:process"
import ora from "ora"
import terminalLink from "terminal-link"

export function createStartCommand() {
  return new Command()
    .command("start")
    .description("Start the Kolo container")
    .action(async () => {
      const spinner = ora("Starting container...").start()
      try {
        const exists = await checkContainerExists()
        if (!exists) {
          spinner.fail("Container not found")
          console.error(
            style.error(
              "The Kolo container does not exist. Please run 'kolo init' first to initialize Kolo.",
            ),
          )
          process.exit(1)
        }

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
      } catch (error) {
        spinner.fail("Failed to start container")
        console.error(
          style.error("Error starting container:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    })
}
