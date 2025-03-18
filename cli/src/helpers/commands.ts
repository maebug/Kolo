import { style } from "../colors.ts"
import {
  type DockerContainerCheckResult,
  checkDockerAndContainer,
} from "../docker.ts"
import process from "node:process"
import ora from "ora"

// Define Spinner type to avoid namespace issues
type Spinner = ReturnType<typeof ora>

/**
 * Validates Docker is running and container exists
 * Returns Docker check result if everything is valid
 */
export async function validateDockerAndContainer(
  spinner: Spinner,
  options: { requireContainer: boolean } = { requireContainer: true },
): Promise<DockerContainerCheckResult> {
  const result = await checkDockerAndContainer()

  if (!result.dockerRunning) {
    spinner.fail("Docker is not running")
    console.error(
      style.error(
        "Docker is not available or not running. Please make sure Docker is installed and running.",
      ),
    )
    process.exit(1)
  }

  if (options.requireContainer && !result.containerExists) {
    spinner.fail("Container not found")
    console.error(
      style.error(
        "The Kolo container does not exist. Please run 'kolo init' first.",
      ),
    )
    process.exit(1)
  }

  return result
}

/**
 * Higher-order function to handle command execution with spinner
 */
export function withSpinner<T>(
  message: string,
  action: (spinner: Spinner) => Promise<T>,
  errorMessage: string,
): () => Promise<T> {
  return async () => {
    const spinner = ora(style.primary(message)).start()
    try {
      const result = await action(spinner)
      return result
    } catch (error) {
      spinner.fail(errorMessage)
      console.error(
        style.error(`${errorMessage}:`),
        error instanceof Error ? error.message : String(error),
      )
      process.exit(1)
    }
  }
}
