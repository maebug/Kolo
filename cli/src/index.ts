#!/usr/bin/env node
import { style } from "./colors.ts"
import { convertToTrainingDataset, saveTrainingDataset } from "./converter.ts"
import {
  getDockerfileContent,
  initContainer,
  stopContainer,
  checkContainerExists,
  startContainer,
  destroyContainer,
  checkComponents,
  containerServices,
  checkServicesHealth,
} from "./docker.ts"
import { validateSourceFile } from "./validator.ts"
import Table from "cli-table3"
import { Command } from "commander"
import inquirer from "inquirer"
import { readFileSync, existsSync } from "node:fs"
import process from "node:process"
import ora from "ora"
import terminalLink from "terminal-link"

type CommandOptions = {
  force?: boolean
  verbose?: boolean
  container?: boolean
  volume?: boolean
  image?: boolean
  all?: boolean
}

/**
 * Displays the health check status of services running on the Kolo container.
 *
 * This function performs a health check on a list of services,  then
 * displays the status of each service in a table format. It uses a spinner to
 * indicate the progress of the health check.
 *
 * @param {string} [message="Checking services health..."] - The message to
 *   display while performing the health check.
 * @returns {Promise<void>} A promise that resolves when the health check is
 *   complete.
 */
async function displayHealthCheck(
  message = "Checking services health...",
): Promise<void> {
  const healthSpinner = ora(message).start()
  const healthChecks = await checkServicesHealth()
  healthSpinner.succeed("Health check completed")

  const servicesTable = new Table({
    head: [
      style.title("Service"),
      style.title("URL"),
      style.title("Status"),
      style.title("Response Time"),
    ],
  })

  healthChecks.forEach((service) => {
    servicesTable.push([
      service.name,
      terminalLink.isSupported
        ? style.path(terminalLink(service.url, service.url))
        : style.path(service.url),
      service.isHealthy
        ? style.success("Healthy")
        : style.error("Not Responding"),
      service.responseTime
        ? style.secondary(`${service.responseTime}ms`)
        : style.error("N/A"),
    ])
  })

  console.log(servicesTable.toString())

  const unhealthyServices = healthChecks.filter((s) => !s.isHealthy)
  if (unhealthyServices.length > 0) {
    console.log(style.warning("\nWarning: Some services are not responding:"))
    unhealthyServices.forEach((service) => {
      console.log(style.error(`- ${service.name} (${service.url})`))
    })
  }
}

const program = new Command()

program
  .name(style.primary("kolo"))
  .description(
    style.primary("CLI for converting and managing training datasets"),
  )
  .version("1.0.0")

program
  .command("convert")
  .description("Convert a source file into a training dataset format")
  .argument("<source>", "path to the source file")
  .argument("<destination>", "path where the converted file will be saved")
  .option("-f, --force", "overwrite destination file if it exists", false)
  .action(
    async (source: string, destination: string, options: CommandOptions) => {
      try {
        const validateSpinner = ora("Validating source file...").start()
        const validation = validateSourceFile(source)

        if (!validation.valid) {
          validateSpinner.fail("Validation failed")
          console.error(
            style.error(validation.error ?? "Unknown validation error"),
          )
          process.exit(1)
        }
        validateSpinner.succeed("Source file validated")

        if (existsSync(destination) && !options.force) {
          const { confirmOverwrite } = await inquirer.prompt<{
            confirmOverwrite: boolean
          }>([
            {
              type: "confirm",
              name: "confirmOverwrite",
              message: `File ${destination} already exists. Do you want to overwrite it?`,
              default: false,
            },
          ])

          if (!confirmOverwrite) {
            console.error(style.error("Operation cancelled by user"))
            process.exit(1)
          }
        }

        const convertSpinner = ora("Converting file...").start()
        const sourceData = JSON.parse(readFileSync(source, "utf-8"))
        const dataset = convertToTrainingDataset(sourceData)
        convertSpinner.succeed("File converted")

        const saveSpinner = ora("Saving training dataset...").start()
        saveTrainingDataset(dataset, destination)
        saveSpinner.succeed("Training dataset saved")

        console.log(
          style.success(
            `Successfully converted ${style.path(source)} to ${style.path(destination)}`,
          ),
        )
      } catch (error) {
        ora().fail("Operation failed")
        console.error(
          style.error("Conversion error:"),
          error instanceof Error ? error.message : String(error),
        )
        process.exit(1)
      }
    },
  )

program
  .command("dockerfile")
  .description(
    "Display the Dockerfile that will be used to build the container",
  )
  .action(async () => {
    const spinner = ora("Reading Dockerfile...").start()
    try {
      const content = await getDockerfileContent()
      spinner.succeed("Dockerfile loaded")
      console.log(style.secondary("Dockerfile contents:"))
      console.log(content)
    } catch (error) {
      spinner.fail("Failed to read Dockerfile")
      console.error(
        style.error("Error reading Dockerfile:"),
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program
  .command("init")
  .description("Initialize and start the Kolo container")
  .option("-v, --verbose", "display verbose output", false)
  .action(async (options: CommandOptions) => {
    // Check existing components first
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
          "Docker version": style.secondary(result.dockerStatus.version || ""),
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

      const healthSpinner = ora("Performing initial health check...").start()
      await displayHealthCheck()
    } catch (error) {
      spinner.fail("Failed to initialize container")
      console.error(
        style.error("Error initializing container:"),
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program
  .command("stop")
  .description("Stop the Kolo container")
  .action(async () => {
    const spinner = ora("Stopping container...").start()
    try {
      await stopContainer()
      spinner.succeed("Container stopped successfully")
    } catch (error) {
      spinner.fail("Failed to stop container")
      console.error(
        style.error("Error stopping container:"),
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program
  .command("dev:color-test")
  .description("Test the color theme")
  .action(() => {
    // Base
    console.log(style.primary("Primary color"))
    console.log(style.secondary("Secondary color"))

    // Status styles
    console.log(style.error("Error color"))
    console.log(style.success("Success color"))
    console.log(style.warning("Warning color"))
    console.log(style.info("Info color"))

    // Special styles
    console.log(style.command("Command color"))
    console.log(style.path("Path color"))
    console.log(style.title("Title color"))
  })

program
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

program
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
        style.error("  • All selected components will be permanently removed"),
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

      if (destroyOptions.container) {
        summaryTable.push(["Container", style.success("Removed")])
      }
      if (destroyOptions.volume) {
        summaryTable.push(["Volume", style.success("Removed")])
      }
      if (destroyOptions.image) {
        summaryTable.push(["Image", style.success("Removed")])
      }

      console.log("\nDestruction summary:")
      console.log(summaryTable.toString())

      process.exit(0)
    } catch (error) {
      spinner.fail("Failed to destroy Kolo resources")
      console.error(
        style.error("Error:"),
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program
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

program.parse()
