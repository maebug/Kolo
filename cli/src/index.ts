#!/usr/bin/env node
import { confirmOverwrite } from "./cli.js"
import { convertToDataset, saveDataset } from "./converter.js"
import { validateSourceFile } from "./validator.js"
import { Command } from "commander"
import { readFileSync, existsSync } from "fs"

const program = new Command()

program
  .name("converter")
  .description("CLI to convert files to different formats")
  .version("1.0.0")

program
  .command("convert")
  .description("Convert a file to the specified format")
  .argument("<source>", "source file path")
  .argument("<destination>", "destination file path")
  .option("-f, --force", "force overwrite of existing files", false)
  .action(async (source, destination, options) => {
    try {
      // Validate source file
      const validation = validateSourceFile(source)
      if (!validation.valid) {
        console.error("Validation failed:", validation.error)
        process.exit(1)
      }

      // Check if destination exists
      if (existsSync(destination) && !options.force) {
        const shouldOverwrite = await confirmOverwrite(destination)
        if (!shouldOverwrite) {
          console.error("Operation cancelled by user")
          process.exit(1)
        }
      }

      // Read and parse source file
      const sourceData = JSON.parse(readFileSync(source, "utf-8"))

      // Convert to dataset format
      const dataset = convertToDataset(sourceData)

      // Save to destination
      saveDataset(dataset, destination)

      console.log("Conversion successful!")
      console.log(`Converted ${source} to ${destination}`)
    } catch (error) {
      console.error(
        "Error during conversion:",
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  })

program.parse()
