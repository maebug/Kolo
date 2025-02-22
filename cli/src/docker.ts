import { dockerConfig } from "./config.ts"
import { filePaths, prepareTempDir } from "./files.ts"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

export function getDockerfileContent(): Promise<string> {
  return Deno.readTextFile(filePaths.dockerfile)
}

async function checkDockerAvailability(): Promise<{
  available: boolean
  version?: string
}> {
  try {
    const { stdout } = await execAsync("docker --version")
    await execAsync("docker info")
    return { available: true, version: stdout.trim() }
  } catch (_error) {
    return {
      available: false,
      version: undefined,
    }
  }
}

async function checkImageExists(imageName: string): Promise<boolean> {
  try {
    await execAsync(`docker image inspect ${imageName}`)
    return true
  } catch (_error) {
    return false
  }
}

export interface DockerBuildResult {
  imageExisted: boolean
  imageName: string
  buildOutput?: string
}

export interface DockerVolumeResult {
  name: string
  output: string
}

export interface DockerContainerResult {
  name: string
  ports: {
    ssh: number
    web: number
  }
  output: string
}

export interface ContainerInitResult {
  dockerStatus: { available: boolean; version?: string }
  build: DockerBuildResult
  volume: DockerVolumeResult
  container: DockerContainerResult
}

export async function initContainer(): Promise<ContainerInitResult> {
  const dockerStatus = await checkDockerAvailability()

  if (!dockerStatus.available) {
    throw new Error(
      "Docker is not available. Please ensure Docker is installed and running.\n" +
        `Visit ${dockerConfig.installUrl} for installation instructions.`,
    )
  }

  const tempDir = await prepareTempDir()
  const imageExists = await checkImageExists(dockerConfig.imageName)
  let buildOutput: string | undefined

  if (!imageExists) {
    const { stdout } = await execAsync(
      `docker build -t ${dockerConfig.imageName} -f ${tempDir}/dockerfile ${tempDir}`,
    )
    buildOutput = stdout
  }

  const { stdout: volumeOutput } = await execAsync(
    `docker volume create ${dockerConfig.volumeName}`,
  )

  const { stdout: containerOutput } = await execAsync(
    `docker run --gpus all -p ${dockerConfig.sshPort}:22 -p ${dockerConfig.webPort}:8080 ` +
      `-v ${dockerConfig.volumeName}:${dockerConfig.dataPath} -it -d ` +
      `--name ${dockerConfig.containerName} ${dockerConfig.imageName}`,
  )

  return {
    dockerStatus,
    build: {
      imageExisted: imageExists,
      imageName: dockerConfig.imageName,
      buildOutput,
    },
    volume: {
      name: dockerConfig.volumeName,
      output: volumeOutput,
    },
    container: {
      name: dockerConfig.containerName,
      ports: {
        ssh: dockerConfig.sshPort,
        web: dockerConfig.webPort,
      },
      output: containerOutput,
    },
  }
}

export async function stopContainer(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker stop ${dockerConfig.containerName}`,
    )
    return stdout.trim()
  } catch (error) {
    throw new Error(
      `Failed to stop container: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export async function checkContainerExists(): Promise<boolean> {
  try {
    await execAsync(`docker container inspect ${dockerConfig.containerName}`)
    return true
  } catch (_error) {
    return false
  }
}

export async function startContainer(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker start ${dockerConfig.containerName}`,
    )
    return stdout.trim()
  } catch (error) {
    throw new Error(
      `Failed to start container: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
