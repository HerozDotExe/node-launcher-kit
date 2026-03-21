import { EventEmitter } from "node:stream";
import { Auth, InstanceEvents, logger, Modloader, Paths, ProcessArgs, ProcessRam, Version } from "../utils/types";
import path from "node:path";
import { argumentsGenerator, AssetsDownloader, launch, LibrariesDownloader, NativesDownloader, version } from "../core";
import { ConfigError, InstallError, LaunchError } from "../utils/errors";
import { checkJava } from "./java";
import { fixVersionWithDoubleName, installForge, ModloaderConfig } from "../core/modloaders";
import { ChildProcessWithoutNullStreams } from "node:child_process";
import { readJson } from "../utils/fs";
import { mergeManifests } from "../core/mergeManifests";

export interface BaseConfig {
    version: string;
    auth: Auth;
    paths: Paths
    javaExecutable: string
    modloader?: Modloader;
    args?: ProcessArgs;
    ram?: { max?: string; min?: string }
}

export interface Config extends BaseConfig {
    paths: Required<Paths>
    args: Required<ProcessArgs>
    ram: Required<ProcessRam>
}

export function defineConfig(logger: logger, ...layers: Partial<BaseConfig>[]) {
    let config: Partial<BaseConfig> = {} as Partial<BaseConfig>;
    for (const layer of layers) {
        config = { ...config, ...layer }
    }
    if (!config.auth || !config.paths?.root || !config.paths?.instance || !config.version || !config.javaExecutable) {
        throw new ConfigError("Invalid config provided", config, logger)
    }

    config.paths = {
        root: config.paths.root,
        instance: config.paths.instance,
        versions: config.paths.versions ?? path.join(config.paths.root, "versions"),
        assets: config.paths.assets ?? path.join(config.paths.root, "assets"),
        libraries: config.paths.libraries ?? path.join(config.paths.root, "libraries"),
    };

    config.args = { java: config.args?.java ?? "", game: config.args?.game ?? "" };

    config.ram = { max: config.ram?.max ?? "2G", min: config.ram?.min ?? "2G" };

    return config as Config
}

export class Instance extends EventEmitter<InstanceEvents> {
    ready: boolean
    config: Config
    versionLocation: string
    versionManifest: Version
    logger: logger

    constructor(...layers: Partial<BaseConfig>[]) {
        super()
        this.logger = (step: string, message: unknown) => {
            this.emit("log", step, message)
        }
        this.config = defineConfig(this.logger, ...layers)
        this.ready = false
        this.versionManifest = {} as Version
        this.versionLocation = ""
    }

    private async log(step: string, message: unknown) {
        this.emit("log", step, message)
    }

    private async init() {
        this.log("init", "Initializing instance")

        this.versionLocation = path.join(this.config.paths.versions, this.config.version);

        if (this.config.modloader) {
            this.config.modloader.version = fixVersionWithDoubleName(this.config.version, this.config.modloader)
        }

        this.versionManifest = await version.getVersionManifest(
            this.config.version,
            this.versionLocation,
        );

        this.ready = true
    }

    async install() {
        try {
            if (!this.ready) await this.init()

            await version.downloadJar(
                this.versionManifest,
                this.versionLocation,
            );
        } catch (error) {
            throw new InstallError("An error occured while initializing instance", "install-init", this.config, this.logger, { cause: error })
        }

        try {
            const librariesDownloader = await LibrariesDownloader(
                this.config.paths.libraries,
                this.versionManifest,
            );

            librariesDownloader.on("completed", () => {
                this.emit(
                    "progress",
                    "libraries",
                    librariesDownloader.done,
                    librariesDownloader.total,
                    librariesDownloader.doneSize,
                    librariesDownloader.totalSize,
                );
            });

            await librariesDownloader.run();
        } catch (error) {
            throw new InstallError("An error occured while downloading libraries", "libraries", this.config, this.logger, { cause: error })
        }

        try {
            const assetsDownloader = await AssetsDownloader(
                this.config.paths.assets,
                this.versionManifest,
            );

            assetsDownloader.on("completed", () => {
                this.emit(
                    "progress",
                    "assets",
                    assetsDownloader.done,
                    assetsDownloader.total,
                    assetsDownloader.doneSize,
                    assetsDownloader.totalSize,
                );
            });

            await assetsDownloader.run();
        } catch (error) {
            throw new InstallError("An error occured while downloading assets", "assets", this.config, this.logger, { cause: error })
        }

        try {
            const nativesDownloader = await NativesDownloader(
                path.join(this.config.paths.instance, "natives"),
                this.versionManifest!,
            );
            nativesDownloader.on("completed", () => {
                this.emit(
                    "progress",
                    "natives",
                    nativesDownloader.done,
                    nativesDownloader.total,
                    nativesDownloader.doneSize,
                    nativesDownloader.totalSize,
                );
            });
            await nativesDownloader.run();
        } catch (error) {
            throw new InstallError("An error occured while downloadng natives", "natives", this.config, this.logger, { cause: error })
        }

        const javaError = await checkJava(this.config.javaExecutable)
        if (javaError) {
            throw new InstallError("Invalid java provided", "java", this.config, this.logger, { cause: javaError })
        }

        if (this.config.modloader) {
            try {
                switch (this.config.modloader.name) {
                    case "forge":
                    case "neoforge":
                        await installForge(
                            this.config as ModloaderConfig,
                            this.versionManifest,
                            this.logger
                        );
                        break;
                    default:
                        throw new Error("Unknown modloader");
                }
            } catch (error) {
                throw new InstallError("An error occured while installing the modloader", "modloader", this.config, this.logger, { cause: error })
            }
        }
    }

    async launch(): Promise<ChildProcessWithoutNullStreams> {
        try {
            if (!this.ready) await this.init()
        } catch (error) {
            throw new LaunchError("An error occured while initializing instance", "launch-init", this.config, this.logger, { cause: error })
        }

        if (this.config.modloader) {
            try {
                switch (this.config.modloader.name) {
                    case "forge": {
                        const forgeVersionManifest = await readJson<Version>(
                            path.join(
                                this.config.paths.versions,
                                `${this.config.version}-${this.config.modloader.name}-${this.config.modloader.version}`,
                                `${this.config.version}-${this.config.modloader.name}-${this.config.modloader.version}.json`,
                            ),
                        );

                        this.versionManifest = mergeManifests(
                            this.versionManifest!,
                            forgeVersionManifest,
                        );
                        break;
                    }
                    case "neoforge":
                        {
                            const neoForgeVersionManifest = await readJson<Version>(
                                path.join(
                                    this.config.paths.versions,
                                    `${this.config.modloader.name}-${this.config.modloader.version}`,
                                    `${this.config.modloader.name}-${this.config.modloader.version}.json`,
                                ),
                            );

                            this.versionManifest = mergeManifests(
                                this.versionManifest!,
                                neoForgeVersionManifest,
                            );
                        }
                        break;
                    default:
                        throw new Error("Unknown modloader");
                }
            } catch (error) {
                throw new LaunchError("An error occured while preparing the modloader", "modloader", this.config, this.logger, { cause: error })
            }
        }

        let args;
        try {
            args = await argumentsGenerator.generateLaunchArguments(
                this.versionManifest,
                this.config
            );

        } catch (error) {
            throw new LaunchError("An error occured while generating launch arguments", "arguments", this.config, this.logger, { cause: error })
        }

        try {
            const process = launch(args!, this.config.paths.instance, this.logger);

            return process;
        } catch (error) {
            throw new LaunchError("An error occured while launching minecraft", "launch-process", this.config, this.logger, { cause: error })
        }
    }
}