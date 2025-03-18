import { style } from "../colors.ts"
import { copyToContainer, clearContainerDirectory } from "../docker.ts"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import ora from "ora"

type Spinner = ReturnType<typeof ora>

/**
 * Copies a directory from the host to a Docker container
 * @param sourceDir The source directory path on the host
 * @param containerName The name of the target Docker container
 * @param destinationPath The destination path in the container
 * @param clearDestination Whether to clear the destination directory before copying (default: false)
 * @returns A promise that resolves when the copy operation completes
 */
export async function copyDir(
  spinner: Spinner,
  sourceDir: string,
  containerName: string,
  destinationPath: string,
  clearDestination = false,
): Promise<void> {
  spinner.text = style.primary(`Copying ${sourceDir} to container...`)

  try {
    // Check if the source directory exists
    if (!existsSync(sourceDir)) {
      spinner.fail(`Source directory does not exist: ${sourceDir}`)
      throw new Error(`Source directory not found: ${sourceDir}`)
    }

    // Clear destination directory if requested
    if (clearDestination) {
      spinner.text = style.primary(
        `Clearing destination directory ${destinationPath}...`,
      )
      try {
        await clearContainerDirectory(containerName, destinationPath)
        spinner.text = style.primary(`Successfully cleared ${destinationPath}`)
      } catch (_clearError) {
        spinner.text = style.primary(
          `Note: Could not clear destination directory (it may not exist yet)`,
        )
        // Continue with the copy operation even if clearing fails
      }
    }

    // Resolve full path
    const sourceFullPath = resolve(sourceDir)
    spinner.text = `Copying ${sourceFullPath} to ${containerName}:${destinationPath}`

    // Use the Docker service to copy the directory
    await copyToContainer(sourceFullPath, containerName, destinationPath)

    spinner.succeed(`Successfully copied ${sourceFullPath} to container`)
  } catch (error) {
    spinner.fail("Failed to copy directory to container")
    throw error
  }
}
