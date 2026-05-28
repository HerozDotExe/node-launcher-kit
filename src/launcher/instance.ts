import { EventEmitter } from "events";
import {
  BaseConfig,
  Config,
  InstanceEvents,
  logger,
  PoolFile,
  Version,
  ModloaderConfig,
} from "../utils/types";
import path from "node:path";
import fs from "fs/promises";
import {
  argumentsGenerator,
  AssetsDownloader,
  launch,
  LibrariesDownloader,
  NativesDownloader,
  version,
} from "../core";
import { ConfigError, InstallError, LaunchError } from "../utils/errors";
import { checkJava } from "./java";
import {
  fixVersionWithDoubleName,
  installFabric,
  installForge,
} from "../core/modloaders";
import { ChildProcessWithoutNullStreams } from "node:child_process";
import { prepareManifest } from "../core/mergeManifests";
import { DownloadPool } from "../utils/fetch";

export function defineConfig(logger: logger, ...layers: Partial<BaseConfig>[]) {
  let config: Partial<BaseConfig> = {} as Partial<BaseConfig>;
  for (const layer of layers) {
    config = { ...config, ...layer };
  }
  if (
    !config.auth ||
    !config.paths?.root ||
    !config.paths?.instance ||
    !config.version ||
    !config.javaExecutable
  ) {
    throw new ConfigError("Invalid config provided", config, logger);
  }

  config.paths = {
    root: config.paths.root,
    instance: config.paths.instance,
    versions: config.paths.versions ?? path.join(config.paths.root, "versions"),
    assets: config.paths.assets ?? path.join(config.paths.root, "assets"),
    libraries:
      config.paths.libraries ?? path.join(config.paths.root, "libraries"),
  };

  config.args = {
    java: config.args?.java ?? "",
    game: config.args?.game ?? "",
  };

  config.ram = { max: config.ram?.max ?? "2G", min: config.ram?.min ?? "2G" };

  if (!config.files) {
    config.files = [];
  }

  return config as Config;
}

export class Instance extends EventEmitter<InstanceEvents> {
  ready: boolean;
  config: Config;
  versionLocation: string;
  versionManifest: Version;
  logger: logger;

  constructor(...layers: Partial<BaseConfig>[]) {
    super();
    this.logger = (step: string, message: unknown) => {
      this.emit("log", step, message);
    };
    this.config = defineConfig(this.logger, ...layers);
    this.ready = false;
    this.versionManifest = {} as Version;
    this.versionLocation = "";
  }

  private async log(step: string, message: unknown) {
    this.emit("log", step, message);
  }

  private async init() {
    this.log("init", "Initializing instance");

    this.versionLocation = path.join(
      this.config.paths.versions,
      this.config.version,
    );

    if (this.config.modloader?.name === "forge") {
      this.config.modloader.version = fixVersionWithDoubleName(
        this.config.version,
        this.config.modloader,
      );
    }

    this.versionManifest = await version.getVersionManifest(
      this.config.version,
      this.versionLocation,
    );

    this.ready = true;
  }

  async install() {
    try {
      if (!this.ready) await this.init();

      await version.downloadJar(this.versionManifest, this.versionLocation);
    } catch (error) {
      throw new InstallError(
        "An error occured while initializing instance",
        "install-init",
        this.config,
        this.logger,
        { cause: error },
      );
    }

    this.log("install-libraries", "Downloading libraries");

    try {
      const librariesDownloader = await LibrariesDownloader(
        this.config.paths.libraries,
        this.versionManifest,
      );

      librariesDownloader.on("completed", () => {
        this.emit(
          "progress",
          "install-libraries",
          librariesDownloader.done,
          librariesDownloader.total,
          librariesDownloader.doneSize,
          librariesDownloader.totalSize,
        );
      });

      await librariesDownloader.run();
    } catch (error) {
      throw new InstallError(
        "An error occured while downloading libraries",
        "install-libraries",
        this.config,
        this.logger,
        { cause: error },
      );
    }

    this.log("install-assets", "Downloading assets");

    try {
      const assetsDownloader = await AssetsDownloader(
        this.config.paths.assets,
        this.versionManifest,
      );

      assetsDownloader.on("completed", () => {
        this.emit(
          "progress",
          "install-assets",
          assetsDownloader.done,
          assetsDownloader.total,
          assetsDownloader.doneSize,
          assetsDownloader.totalSize,
        );
      });

      await assetsDownloader.run();
    } catch (error) {
      throw new InstallError(
        "An error occured while downloading assets",
        "install-assets",
        this.config,
        this.logger,
        { cause: error },
      );
    }

    this.log("install-natives", "Downloading natives");

    try {
      const nativesDownloader = await NativesDownloader(
        path.join(this.config.paths.instance, "natives"),
        this.versionManifest!,
      );
      nativesDownloader.on("completed", () => {
        this.emit(
          "progress",
          "install-natives",
          nativesDownloader.done,
          nativesDownloader.total,
          nativesDownloader.doneSize,
          nativesDownloader.totalSize,
        );
      });
      await nativesDownloader.run();
    } catch (error) {
      throw new InstallError(
        "An error occured while downloading natives",
        "install-natives",
        this.config,
        this.logger,
        { cause: error },
      );
    }

    this.log("install-java", "Checking java");

    const javaError = await checkJava(this.config.javaExecutable);
    if (javaError) {
      throw new InstallError(
        "Invalid java provided",
        "install-java",
        this.config,
        this.logger,
        { cause: javaError },
      );
    }

    if (this.config.modloader) {
      this.log("install-modloader", "Installing modloader");
      this.emit("progress", "install-modloader", 0, 1, 0, 1);
      try {
        switch (this.config.modloader.name) {
          case "forge":
          case "neoforge":
            await installForge(this.config as ModloaderConfig, this.logger);
            break;
          case "fabric":
            await installFabric(this.config as ModloaderConfig, this.logger);
            break;
          default:
            throw new Error("Unknown modloader");
        }
      } catch (error) {
        throw new InstallError(
          "An error occured while installing the modloader",
          "install-modloader",
          this.config,
          this.logger,
          { cause: error },
        );
      }
      this.emit("progress", "install-modloader", 1, 1, 1, 1);
    }

    if (this.config.files.length > 0) {
      this.log("install-modpack-files", "Downloading modpack's files");
      try {
        const files = this.config.files.map<PoolFile>((f) => {
          return {
            url: f.url,
            path: path.join(this.config.paths.instance, f.path),
            size: f.size,
          };
        });
        const pool = new DownloadPool(files, {
          pQueueOptions: { concurrency: 5 },
          overwrite: false,
        });
        pool.on("completed", () => {
          this.emit(
            "progress",
            "install-modpack-files",
            pool.done,
            pool.total,
            pool.doneSize,
            pool.totalSize,
          );
        });
        await pool.run();
      } catch (error) {
        throw new InstallError(
          "An error occured while downloading modpack's files",
          "install-modpack-files",
          this.config,
          this.logger,
          { cause: error },
        );
      }
    }

    if (this.config.overridesPath) {
      this.log("install-modpack-overrides", "Copying modpack's overrides");
      this.emit("progress", "install-modpack-overrides", 0, 1, 0, 1);
      try {
        await fs.cp(this.config.overridesPath, this.config.paths.instance, {
          recursive: true,
        });
      } catch (error) {
        throw new InstallError(
          "An error occured while copying modpack's overrides",
          "install-modpack-overrides",
          this.config,
          this.logger,
          { cause: error },
        );
      }
      this.emit("progress", "install-modpack-overrides", 1, 1, 1, 1);
    }
  }

  async launch(): Promise<ChildProcessWithoutNullStreams> {
    try {
      if (!this.ready) await this.init();
    } catch (error) {
      throw new LaunchError(
        "An error occured while initializing instance",
        "launch-init",
        this.config,
        this.logger,
        { cause: error },
      );
    }

    if (this.config.modloader) {
      this.log("launch-modloader", "Preparing modloader");
      try {
        switch (this.config.modloader.name) {
          case "forge":
          case "neoforge":
          case "fabric":
            this.versionManifest = await prepareManifest(
              this.config as ModloaderConfig,
              this.versionManifest,
            );
            break;
          default:
            throw new Error("Unknown modloader");
        }
      } catch (error) {
        throw new LaunchError(
          "An error occured while preparing the modloader",
          "launch-modloader",
          this.config,
          this.logger,
          { cause: error },
        );
      }
    }

    this.log("launch-arguments", "Preparing launch arguments");

    let args;
    try {
      args = await argumentsGenerator.generateLaunchArguments(
        this.versionManifest,
        this.config,
      );
    } catch (error) {
      throw new LaunchError(
        "An error occured while generating launch arguments",
        "launch-arguments",
        this.config,
        this.logger,
        { cause: error },
      );
    }

    this.log("launch-process", "Preparing launch arguments");
    try {
      const process = launch(args!, this.config.paths.instance, this.logger);

      return process;
    } catch (error) {
      throw new LaunchError(
        "An error occured while launching minecraft",
        "launch-process",
        this.config,
        this.logger,
        { cause: error },
      );
    }
  }
}
