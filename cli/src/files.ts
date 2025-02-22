import { copy } from "@std/fs"
import { dirname, join, fromFileUrl } from "@std/path"

// @todo Find a better way to handle files. Right now to add a file to the CLI,
// you have to add it to the files object below, then add it to the import
// flags for the build process in package.json.

const cliRoot = join(dirname(fromFileUrl(import.meta.url)), "..")

/**
 * Gets the absolute file path for a file embedded in the CLI.
 *
 * This is possible because Deno creates a temporary directory for the files
 * embedded in the CLI.
 *
 * @param envVarName Name of an environment variable containing a file or
 * directory path.
 */
const getFilePath = (envVarName: string): string => {
  return join(cliRoot, Deno.env.get(envVarName) || "")
}

/**
 * Absolute file paths for all files embedded in the CLI.
 */
export const filePaths = {
  cliRoot: cliRoot,
  projectRoot: join(cliRoot, ".."),
  dockerfile: getFilePath("FILE_DOCKERFILE"),
  scripts: getFilePath("DIR_SCRIPTS"),
  torchtune: getFilePath("DIR_TORCHTUNE"),
  supervisordConf: getFilePath("FILE_SUPERVISORD_CONF"),
}

/**
 * Creates a temporary directory and copies required files into it.
 * @returns Path to the temporary directory
 */
export async function prepareTempDir(): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "kolo-" })

  // Copy scripts directory
  await copy(filePaths.scripts, join(tempDir, "scripts"), { overwrite: true })

  // Copy torchtune directory
  await copy(filePaths.torchtune, join(tempDir, "torchtune"), {
    overwrite: true,
  })

  // Copy Dockerfile
  await copy(filePaths.dockerfile, join(tempDir, "dockerfile"), {
    overwrite: true,
  })

  // Copy supervisord.conf
  await copy(filePaths.supervisordConf, join(tempDir, "supervisord.conf"), {
    overwrite: true,
  })

  return tempDir
}
