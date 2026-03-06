import {
  Auth,
  InstanceEvents,
  Modloader,
  Paths,
  SupportedModloaders,
  Version,
} from "../utils/types";
import * as core from "../core";
import path from "path";
import { EventEmitter } from "node:events";
import { InstallError, LaunchError } from "../utils/errors";
import { installForge } from "../core/modloaders";
import { readJson } from "../utils/fs";
import { mergeManifests } from "../core/mergeManifests";
import { checkJava } from "./java";
import { ChildProcessWithoutNullStreams } from "node:child_process";

export class Instance extends EventEmitter<InstanceEvents> {
  version?: string;
  modloader?: Modloader;
  auth?: Auth;
  paths?: Paths;
  args: { java: string; game: string };
  ram: { max: string; min: string };
  versionManifest?: Version;
  versionLocation?: string;
  instanceLocation?: string;
  ready: boolean;
  javaExecutable?: string;

  constructor() {
    super();
    this.args = { java: "", game: "" };
    this.ram = { max: "2G", min: "2G" };
    this.ready = false;
  }

  setVersion(version: string) {
    this.version = version;
  }

  setModLoader(name: SupportedModloaders, version: string) {
    this.modloader = { name, version };
  }

  setJavaExecutable(path: string) {
    this.javaExecutable = path;
  }

  setPaths(paths: Paths | string): void {
    if (typeof paths === "string") {
      this.paths = {
        root: paths,
        versions: path.join(paths, "versions"),
        assets: path.join(paths, "assets"),
        libraries: path.join(paths, "libraries"),
        instances: path.join(paths, "instances"),
      };
    } else {
      this.paths = {
        root: paths.root,
        versions: paths.versions || path.join(paths.root, "versions"),
        assets: paths.assets || path.join(paths.root, "assets"),
        libraries: paths.libraries || path.join(paths.root, "libraries"),
        instances: paths.instances || path.join(paths.root, "instances"),
      };
    }
  }

  setAuth(auth: Auth) {
    this.auth = auth;
  }

  setArgs({ java, game }: { java?: string; game?: string }) {
    this.args.java = java || "";
    this.args.game = game || "";
  }

  setRAM({ min, max }: { min?: string; max?: string }) {
    this.ram.min = min || "2G";
    this.ram.max = max || "2G";
  }

  private async initialize() {
    if (!this.javaExecutable || !this.paths?.root || !this.version || !this.auth) {
      throw new Error("Missing options")
    }

    this.versionLocation = path.join(this.paths.versions!, this.version);
    this.instanceLocation = path.join(this.paths.instances!, this.version);

    this.versionManifest = await core.version.getVersionManifest(
      this.version,
      this.versionLocation,
    );
  }

  async install() {
    try {
      await this.initialize();
      this.ready = true;
      await core.version.downloadJar(
        this.versionManifest!,
        this.versionLocation!,
      );
    } catch (original) {
      const error = new InstallError("installInit", original);
      error.throw();
    }

    try {
      const librariesDownloader = await core.LibrariesDownloader(
        this.paths!.libraries!,
        this.versionManifest!,
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
    } catch (original) {
      const error = new InstallError("libraries", original);
      error.throw();
    }

    try {
      const assetsDownloader = await core.AssetsDownloader(
        this.paths!.assets!,
        this.versionManifest!,
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
    } catch (original) {
      const error = new InstallError("assets", original);
      error.throw();
    }

    try {
      const nativesDownloader = await core.NativesDownloader(
        path.join(this.instanceLocation!, "natives"),
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
    } catch (original) {
      const error = new InstallError("natives", original);
      error.throw();
    }

    const javaError = await checkJava(this.javaExecutable!)
    if (javaError) {
      const error = new InstallError("java", javaError)
      error.throw()
    }

    if (this.modloader) {
      try {
        switch (this.modloader.name) {
          case "forge":
          case "neoforge":
            await installForge(
              this.version!,
              this.modloader,
              this.javaExecutable!,
              this.paths!.root,
              this.paths!.libraries!,
              this.paths!.versions!,
            );
            break;
          default:
            throw new Error("Unknown modloader");
        }
      } catch (original) {
        const error = new InstallError("modloader", original);
        error.throw();
      }
    }
  }

  async launch(): Promise<ChildProcessWithoutNullStreams> {
    try {
      if (!this.ready) {
        try {
          await this.initialize();
        } catch (original) {
          const error = new InstallError("launchInit", original);
          error.throw();
        }
      }

      if (this.modloader) {
        switch (this.modloader.name) {
          case "forge": {
            const forgeVersionManifest = await readJson<Version>(
              path.join(
                this.paths!.versions!,
                `${this.version}-${this.modloader.name}-${this.modloader.version}`,
                `${this.version}-${this.modloader.name}-${this.modloader.version}.json`,
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
                  this.paths!.versions!,
                  `${this.modloader.name}-${this.modloader.version}`,
                  `${this.modloader.name}-${this.modloader.version}.json`,
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
      }

      const args = await core.arguments.generateLaunchArguments(
        this.versionManifest!,
        this.javaExecutable!,
        this.instanceLocation!,
        this.paths!.libraries!,
        this.paths!.assets!,
        this.versionLocation!,
        this.auth!,
        this.args,
        this.ram
      );

      const process = core.launch(args, this.instanceLocation!);

      return process;
    } catch (original) {
      const error = new LaunchError(
        {
          version: this.version!,
          auth: this.auth!,
          paths: this.paths!,
          customGameArgs: this.args.game!,
          customJvmArgs: this.args.java!,
          versionManifest: this.versionManifest!,
          modloader: this.modloader!,
        },
        original as Error,
      );
      throw error.throw();
    }
  }
}
