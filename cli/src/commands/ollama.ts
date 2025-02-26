import { dockerConfig } from "../config.ts"
import { validateDockerAndContainer, withSpinner } from "../helpers/commands.ts"
import { Command } from "commander"
import process from "node:process"

export function createOllamaCommand() {
  return new Command()
    .name("ollama")
    .description("Execute Ollama commands inside the Kolo container")
    .argument("[args...]", "Arguments to pass to ollama")
    .allowUnknownOption()
    .enablePositionalOptions()
    .passThroughOptions()
    .action((args) =>
      withSpinner(
        "Checking container...",
        async (spinner) => {
          await validateDockerAndContainer(spinner)

          spinner.stop()

          // Using spawn to maintain real-time output streaming
          const { spawn } = await import("node:child_process")
          const dockerProcess = spawn(
            "docker",
            ["exec", "-it", dockerConfig.containerName, "ollama", ...args],
            {
              stdio: "inherit",
            },
          )

          // Handle process exit
          dockerProcess.on("exit", (code) => {
            if (code !== 0) {
              process.exit(code ?? 1)
            }
          })
        },
        "Command failed",
      )(),
    )
}
