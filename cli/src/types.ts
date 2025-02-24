export type CommandOptions = {
  force?: boolean
  verbose?: boolean
  container?: boolean
  volume?: boolean
  image?: boolean
  all?: boolean
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface ServiceHealth {
  name: string
  url: string
  isHealthy: boolean
  responseTime?: number
}

export interface ContainerService {
  name: string
  url: string
}

export interface ComponentStatus {
  container: boolean
  volume: boolean
  image: boolean
}

export interface InitResult {
  dockerStatus: {
    version: string
  }
  build: {
    imageExisted: boolean
    imageName: string
    buildOutput?: string
  }
  volume: {
    name: string
    output: string
  }
  container: {
    name: string
    output: string
  }
}

export interface DestroyOptions {
  container: boolean
  volume: boolean
  image: boolean
}
