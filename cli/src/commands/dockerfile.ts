import { style } from "../colors.ts"
import { getDockerfileContent } from "../docker.ts"
import { Command } from "commander"
import ora from "ora"
import process from "node:process"

export function createDockerfileCommand() {
  return new Command()
    .command("dockerfile")
    .description("Display the Dockerfile that will be used to build the container")
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
          error instanceof Error ? error.message : String(error)
        )
        process.exit(1)
      }
    })
}
