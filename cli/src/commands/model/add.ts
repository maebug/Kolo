import { style } from "../../colors.ts"
import { dockerConfig } from "../../config.ts"
import {
  validateDockerAndContainer,
  withSpinner,
} from "../../helpers/commands.ts"
import { Command } from "commander"

export function createModelAddCommand() {
  return new Command()
    .name("model:add")
    .alias("model:install")
    .description("Create an Ollama model from a fine-tuned model file")
    .requiredOption("-n, --name <name>", "The name of the model to create")
    .requiredOption("-o, --output-dir <dir>", "The path to the outputs folder")
    .requiredOption("-q, --quantization <type>", "The model quantization type")
    .requiredOption(
      "-t, --tool <source>",
      "The tool source folder (torchtune or unsloth)",
      (value) => {
        if (value !== "torchtune" && value !== "unsloth") {
          throw new Error("Tool must be either 'torchtune' or 'unsloth'")
        }
        return value
      },
    )
    .action((options) =>
      withSpinner(
        "Checking container status...",
        async (spinner) => {
          // Validate that Docker is available and container is running
          await validateDockerAndContainer(spinner)

          const { name, outputDir, quantization, tool } = options

          spinner.text = `Creating Ollama model '${name}'...`

          // Construct the full path to the model file using the chosen data source
          const baseDir = `/var/kolo_data/${tool}`
          const modelFilePath = `${baseDir}/${outputDir}/Modelfile${quantization}`

          // Using child_process to execute the command
          const { exec } = await import("node:child_process")

          await new Promise<void>((resolve, reject) => {
            exec(
              `docker exec -i ${dockerConfig.containerName} ollama create ${name} -f ${modelFilePath}`,
              (error, stdout, stderr) => {
                if (error) {
                  reject(
                    new Error(
                      `Failed to create Ollama model: ${error.message}`,
                    ),
                  )
                  return
                }

                if (stderr && !stderr.includes("pulling")) {
                  console.error(style.warning("Warning:"), stderr)
                }

                console.log(stdout)
                spinner.succeed(`Ollama model '${name}' created successfully!`)
                resolve()
              },
            )
          })
        },
        "Failed to create Ollama model",
      )(),
    )
}
