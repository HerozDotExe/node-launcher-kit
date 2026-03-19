import { BaseConfig, Config } from "../launcher/instance"

export class ConfigError extends Error {
  constructor(message: string, config: Partial<BaseConfig>, options?: ErrorOptions) {
    super(message, options)
    console.log("Provided config was:")
    console.log(config)
  }
}

export class InstallError extends Error {
  constructor(message: string, step: string, config: Config, options?: ErrorOptions) {
    super(`[${step}] ${message}`, options)
    console.log("Provided config was:")
    console.log(config)
  }
}

export class LaunchError extends InstallError {}