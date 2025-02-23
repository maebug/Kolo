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
} from "./docker.ts"
import { validateSourceFile } from "./validator.ts"
import { Command } from "commander"
import inquirer from "inquirer"
import { readFileSync, existsSync } from "node:fs"
import process from "node:process"
import ora from "ora"

type CommandOptions = {
  force?: boolean
  verbose?: boolean
  container?: boolean
  volume?: boolean
  image?: boolean
  all?: boolean
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

    console.log(style.title("Detected pre-existing Kolo components:"))
    console.log(
      `${style.secondary("Container exists:")} ${style.command(components.container ? "Yes" : "No")}`,
    )
    console.log(
      `${style.secondary("Volume exists:")} ${style.command(components.volume ? "Yes" : "No")}`,
    )
    console.log(
      `${style.secondary("Image exists:")} ${style.command(components.image ? "Yes" : "No")}`,
    )

    console.log()
    const spinner = ora(
      "Initializing container, this may take a while...",
    ).start()

    try {
      const result = await initContainer()
      spinner.succeed("Container initialized successfully")

      console.log(style.title("Container setup complete:"))
      console.log(
        `${style.primary("Docker version:")} ${style.secondary(result.dockerStatus.version || "")}`,
      )

      // Image status
      if (result.build.imageExisted) {
        console.log(
          `${style.primary("Image status:")} ${style.secondary(`Using existing image ${result.build.imageName}`)}`,
        )
      } else {
        console.log(
          `${style.primary("Image status:")} ${style.secondary(`Built new image ${result.build.imageName}`)}`,
        )
        if (options.verbose && result.build.buildOutput) {
          console.log(style.primary("Build output:"))
          console.log(style.secondary(result.build.buildOutput))
        }
      }

      // Volume status
      console.log(
        `${style.primary("Volume:")} ${style.secondary(result.volume.name)}`,
      )
      if (options.verbose) {
        console.log(style.primary("Volume creation output:"))
        console.log(style.secondary(result.volume.output))
      }

      // Container status
      console.log(
        `${style.primary("Container name:")} ${style.secondary(result.container.name)}`,
      )
      console.log(
        `${style.primary("SSH port:")} ${style.secondary(String(result.container.ports.ssh))}`,
      )
      console.log(
        `${style.primary("Web port:")} ${style.secondary(String(result.container.ports.web))}`,
      )
      if (options.verbose) {
        console.log(style.primary("Container creation output:"))
        console.log(style.secondary(result.container.output))
      }
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
    console.log(style.primary("Primary color"))
    console.log(style.secondary("Secondary color"))
    console.log(style.error("Error color"))
    console.log(style.success("Success color"))
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

    if (!options.force) {
      const components = Object.entries(destroyOptions)
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ")

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: "confirm",
          name: "confirm",
          message: style.error(
            `This will permanently remove the following Kolo components: ${components}.\n` +
              "This action cannot be undone. Are you sure you want to continue?",
          ),
          default: false,
        },
      ])

      if (!confirm) {
        console.log(style.secondary("Operation cancelled"))
        process.exit(0)
      }
    }

    const spinner = ora("Destroying Kolo resources...").start()
    try {
      await destroyContainer(destroyOptions)
      spinner.succeed("Successfully removed selected Kolo components")
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

program.parse()
