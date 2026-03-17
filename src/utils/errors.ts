import { version as packageVersion } from "../../package.json";
import { Instance } from "../launcher";
import { LaunchErrorConfig } from "./types";

function redactToken(config: LaunchErrorConfig) {
  config.auth.access_token = "token"
  config.auth.client_token = "token"
  return config
}

export class InstallError extends Error {
  config: LaunchErrorConfig | null;
  step: string;
  original: Error;
  moreInfo?: string;
  constructor(step: string, config: LaunchErrorConfig | null, original: unknown, moreInfo?: string) {
    super();
    this.step = step;
    this.original = original as Error;
    this.config = config;
    this.moreInfo = moreInfo;
  }

  throw() {
    console.error(
      `[nlk ${packageVersion}] Error occured when installing ${this.step}: ${this.original.message}`,
    );
    console.error(`[nlk ${packageVersion}] Original error is:`, this.original);

    if (this.moreInfo) {
      console.error(this.moreInfo);
    }

    if (this.config) console.dir(redactToken(this.config));

    throw this;
  }
}

export class LaunchError extends Error {
  config: LaunchErrorConfig;
  original: Error;
  constructor(config: LaunchErrorConfig, original: Error) {
    super();
    this.config = config;
    this.original = original;
  }

  throw() {
    console.error(
      `[nlk ${packageVersion}] Error occured when launching the game: ${this.original.message}`,
    );
    console.error(`[nlk ${packageVersion}] Original error is:`, this.original);
    console.dir(redactToken(this.config));

    throw this;
  }
}

export function throwInstall(step: string, original: unknown, config: Instance) {
  const error = new InstallError(step,
    {
      version: config.version!,
      auth: config.auth!,
      paths: config.paths!,
      customGameArgs: config.args.game!,
      customJvmArgs: config.args.java!,
      versionManifest: config.versionManifest!,
      modloader: config.modloader!,
    },
    original);
  error.throw();
}

export function throwLaunch(original: unknown, config: Instance) {
  const error = new LaunchError({
    version: config.version!,
    auth: config.auth!,
    paths: config.paths!,
    customGameArgs: config.args.game!,
    customJvmArgs: config.args.java!,
    versionManifest: config.versionManifest!,
    modloader: config.modloader!,
  },
    original as Error);
  throw error.throw();
}