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

export interface ComponentStatus {
  container: boolean
  volume: boolean
  image: boolean
}

export async function checkComponents(): Promise<ComponentStatus> {
  const [container, volume, image] = await Promise.all([
    checkContainerExists(),
    checkVolumeExists(),
    checkImageExists(dockerConfig.imageName),
  ])

  return {
    container,
    volume,
    image,
  }
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

async function checkImageExists(imageName: string): Promise<boolean> {
  try {
    await execAsync(`docker image inspect ${imageName}`)
    return true
  } catch (_error) {
    return false
  }
}

export async function checkVolumeExists(): Promise<boolean> {
  try {
    await execAsync(`docker volume inspect ${dockerConfig.volumeName}`)
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

export interface DestroyOptions {
  container?: boolean
  volume?: boolean
  image?: boolean
}

export async function destroyContainer(
  options: DestroyOptions = {},
): Promise<void> {
  const { container = false, volume = false, image = false } = options

  try {
    // Remove container if requested and exists
    if (container && (await checkContainerExists())) {
      await execAsync(`docker rm -f ${dockerConfig.containerName}`)
    }

    // Remove volume if requested
    if (volume) {
      try {
        await execAsync(`docker volume rm ${dockerConfig.volumeName}`)
      } catch (_error) {
        // Ignore error if volume doesn't exist
      }
    }

    // Remove image if requested
    if (image) {
      try {
        await execAsync(`docker rmi ${dockerConfig.imageName}`)
      } catch (_error) {
        // Ignore error if image doesn't exist
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to destroy resources: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export interface ServiceInfo {
  name: string
  port: number
  url: string
}

export async function containerServices(): Promise<ServiceInfo[]> {
  try {
    const { stdout } = await execAsync(
      `docker port ${dockerConfig.containerName}`,
    )
    const services: ServiceInfo[] = []

    const portMappings = stdout.trim().split("\n")
    for (const mapping of portMappings) {
      const [containerPort, hostBinding] = mapping.split(" -> ")
      if (!hostBinding) continue

      const portMatch = containerPort.match(/(\d+)/)
      const hostMatch = hostBinding.match(/([^:]+):(\d+)/)

      if (portMatch && hostMatch) {
        const containerPortNum = parseInt(portMatch[1])
        const hostIp = hostMatch[1]
        const hostPort = parseInt(hostMatch[2])

        let serviceName = "unknown"
        if (containerPortNum === dockerConfig.sshPort)
          serviceName = "Open WebUI (SSH)"
        else if (containerPortNum === dockerConfig.webPort)
          serviceName = "Open WebUI"

        let url = `http://${hostIp}:${hostPort}`
        if (hostIp === "0.0.0.0") {
          url = `http://localhost:${hostPort}`
        }

        services.push({
          name: serviceName,
          port: hostPort,
          url,
        })
      }
    }

    return services
  } catch (error) {
    throw new Error(
      `Failed to scan container services: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export interface ServiceHealthCheck {
  name: string
  port: number
  url: string
  isHealthy: boolean
  responseTime?: number
}

async function checkPortStatus(port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: "localhost", port })
    conn.close()
    return true
  } catch (_error) {
    return false
  }
}

export async function checkServicesHealth(
  maxRetries = 12,
  retryInterval = 5000,
): Promise<ServiceHealthCheck[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const services = await containerServices()
    const healthChecks = await Promise.all(
      services.map(async (service) => {
        const startTime = Date.now()
        const isHealthy = await checkPortStatus(service.port)
        const responseTime = Date.now() - startTime

        return {
          ...service,
          isHealthy,
          responseTime: isHealthy ? responseTime : undefined,
        }
      }),
    )

    const allHealthy = healthChecks.every((check) => check.isHealthy)
    if (allHealthy) {
      return healthChecks
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryInterval))
    }
  }

  // Return final status even if not all services are healthy
  const services = await containerServices()
  return Promise.all(
    services.map(async (service) => {
      const startTime = Date.now()
      const isHealthy = await checkPortStatus(service.port)
      const responseTime = Date.now() - startTime

      return {
        ...service,
        isHealthy,
        responseTime: isHealthy ? responseTime : undefined,
      }
    }),
  )
}
