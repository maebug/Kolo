#!/usr/bin/env node
import { style } from "./colors.ts"
import { convertToTrainingDataset, saveTrainingDataset } from "./converter.ts"
import { getDockerfileContent, initContainer } from "./docker.ts"
import { validateSourceFile } from "./validator.ts"
import { Command } from "commander"
import inquirer from "inquirer"
import { readFileSync, existsSync } from "node:fs"
import process from "node:process"
import ora from "ora"

const program = new Command()

program
  .name(style.primary("kolo"))
  .description(style.primary("CLI to convert files to different formats"))
  .version("1.0.0")

program
  .command("convert")
  .description("Convert a file to the specified format")
  .argument("<source>", "source file path")
  .argument("<destination>", "destination file path")
  .option("-f, --force", "force overwrite of existing files", false)
  .action(async (source, destination, options) => {
    try {
      const validateSpinner = ora("Validating source file...").start()
      // Validate source file
      const validation = validateSourceFile(source)
      if (!validation.valid) {
        validateSpinner.fail("Validation failed")
        console.error(
          style.error(validation.error || "Unknown validation error"),
        )
        process.exit(1)
      }
      validateSpinner.succeed("Source file validated")

      // Check if destination exists
      if (existsSync(destination) && !options.force) {
        const { confirmOverwrite } = await inquirer.prompt([
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
      // Read and parse source file
      const sourceData = JSON.parse(readFileSync(source, "utf-8"))

      // Convert to training dataset format
      const dataset = convertToTrainingDataset(sourceData)
      convertSpinner.succeed("File converted")

      const saveSpinner = ora("Saving training dataset...").start()
      // Save to destination
      saveTrainingDataset(dataset, destination)
      saveSpinner.succeed("Training dataset saved")

      console.log(
        style.success(
          `Converted ${style.path(source)} to ${style.path(destination)}`,
        ),
      )
    } catch (error) {
      ora().fail("Operation failed")
      console.error(
        style.error("Error during conversion:"),
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

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
  .action(async (options) => {
    const spinner = ora(
      "Initializing container, this will take a while...",
    ).start()
    try {
      const result = await initContainer()
      spinner.succeed("Container initialized successfully")

      console.log(style.success("Container setup complete:"))
      console.log(
        style.secondary(`Docker version: ${result.dockerStatus.version}`),
      )

      // Image status
      if (result.build.imageExisted) {
        console.log(
          style.secondary(`Using existing image: ${result.build.imageName}`),
        )
      } else {
        console.log(
          style.secondary(`Built new image: ${result.build.imageName}`),
        )
        if (options.verbose && result.build.buildOutput) {
          console.log(style.secondary("Build output:"))
          console.log(result.build.buildOutput)
        }
      }

      // Volume status
      console.log(style.secondary(`Volume created: ${result.volume.name}`))
      if (options.verbose) {
        console.log(style.secondary("Volume creation output:"))
        console.log(result.volume.output)
      }

      // Container status
      console.log(
        style.secondary(`Container started: ${result.container.name}`),
      )
      console.log(style.secondary(`SSH port: ${result.container.ports.ssh}`))
      console.log(style.secondary(`Web port: ${result.container.ports.web}`))
      if (options.verbose) {
        console.log(style.secondary("Container creation output:"))
        console.log(result.container.output)
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

program.parse()
