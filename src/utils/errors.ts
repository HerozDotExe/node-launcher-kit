import { BaseConfig, Config } from "../launcher/instance"
import { logger } from "./types"

export class ConfigError extends Error {
  constructor(message: string, config: Partial<BaseConfig>, logger: logger, options?: ErrorOptions) {
    super(message, options)
    logger("error", "Provided config was:")
    console.log("error", config)
  }
}

export class InstallError extends Error {
  constructor(message: string, step: string, config: Config, logger: logger, options?: ErrorOptions) {
    super(`[${step}] ${message}`, options)
    logger("error", "Provided config was:")
    console.log(config)
  }
}

export class LaunchError extends InstallError { }