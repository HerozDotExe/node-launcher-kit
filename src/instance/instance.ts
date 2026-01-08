import {
  Auth,
  Modloader,
  Paths,
  SupportedModloaders,
  Version,
} from "../utils/types";
import * as core from "../core";
import path from "path";
import { os, arch } from "../utils/systemInfo";
import { EventEmitter } from "node:events";
import { InstallError, LaunchError } from "../utils/errors";
import { installForge } from "../core/modloaders";
import { getJavaExecutable } from "../core/java";
import { readJson } from "../utils/fs";
import { mergeManifests } from "../core/mergeManifests";

function getJavaOs() {
  switch (os()) {
    case "windows":
      switch (arch()) {
        case "arm":
          return "windows-arm64";
        case "x86":
          return "windows-x86";
        case "x64":
        default:
          return "windows-x64";
      }
    case "osx":
      switch (arch()) {
        case "arm":
          return "mac-os-arm64";
        case "x64":
        case "x86":
        default:
          return "mac-os";
      }
    case "linux":
      switch (arch()) {
        case "x86":
          return "linux-i386";
        case "x64":
        case "arm":
        default:
          return "linux";
      }
  }
}

interface InstanceEvents {
  progress: [
    type: string,
    done: number,
    total: number,
    doneSize: number,
    totalSize: number,
  ];
}

export class Instance extends EventEmitter<InstanceEvents> {
  version: string;
  modloader?: Modloader;
  auth: Auth;
  paths: Paths;
  args: { java: string; game: string };
  versionManifest: Version;
  javaLocation: string;
  versionLocation: string;
  instanceLocation: string;
  ready: boolean;

  constructor() {
    super();
    this.args = { java: "", game: "" };
    this.ready = false;
  }

  setVersion(version: string) {
    this.version = version;
  }

  setModLoader(name: SupportedModloaders, version: string) {
    this.modloader = { name, version };
  }

  setPaths(paths: string);
  setPaths(paths: Paths);
  setPaths(paths: Paths | string) {
    if (typeof paths === "string") {
      this.paths = {
        root: paths,
        versions: path.join(paths, "versions"),
        assets: path.join(paths, "assets"),
        javaRoot: path.join(paths, "java"),
        libraries: path.join(paths, "libraries"),
        instances: path.join(paths, "instances"),
      };
    } else {
      this.paths = {
        root: paths.root,
        versions: paths.versions || path.join(paths.root, "versions"),
        assets: paths.assets || path.join(paths.root, "assets"),
        javaRoot: paths.javaRoot || path.join(paths.root, "java"),
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

  async initialize() {
    this.versionLocation = path.join(this.paths.versions, this.version);
    this.instanceLocation = path.join(this.paths.instances, this.version);

    this.versionManifest = await core.version.getVersionManifest(
      this.version,
      this.versionLocation,
    );

    this.javaLocation = path.join(
      this.paths.javaRoot,
      this.versionManifest.javaVersion.component,
    );
  }

  async install() {
    try {
      await this.initialize();
      this.ready = true;
      await core.version.downloadJar(
        this.versionManifest,
        this.versionLocation,
      );
    } catch (original) {
      const error = new InstallError("version", original);
      error.throw();
    }

    try {
      const librariesDownloader = await core.LibrariesDownloader(
        this.paths.libraries,
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
    } catch (original) {
      const error = new InstallError("libraries", original);
      error.throw();
    }

    try {
      const assetsDownloader = await core.AssetsDownloader(
        this.paths.assets,
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
    } catch (original) {
      const error = new InstallError("assets", original);
      error.throw();
    }

    try {
      const nativesDownloader = await core.NativesDownloader(
        this.instanceLocation,
        this.versionManifest,
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

    try {
      const javaDownloader = await core.java.JavaDownloader(
        getJavaOs(),
        this.versionManifest.javaVersion.component,
        this.paths.javaRoot,
      );
      javaDownloader.on("completed", () => {
        this.emit(
          "progress",
          "java",
          javaDownloader.done,
          javaDownloader.total,
          javaDownloader.doneSize,
          javaDownloader.totalSize,
        );
      });
      await javaDownloader.run();
    } catch (original) {
      const error = new InstallError("java", original);
      error.throw();
    }

    if (this.modloader) {
      try {
        switch (this.modloader.name) {
          case "forge":
          case "neoforge":
            await installForge(
              this.version,
              this.modloader,
              getJavaExecutable(this.javaLocation, false),
              this.paths.root,
              this.paths.libraries,
              this.paths.versions,
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

  async launch() {
    try {
      if (!this.ready) {
        try {
          await this.initialize();
        } catch (original) {
          const error = new InstallError("version", original);
          error.throw();
        }
      }

      switch (this.modloader?.name) {
        case "forge": {
          const forgeVersionManifest = await readJson<Version>(
            path.join(
              this.paths.versions,
              `${this.version}-${this.modloader.name}-${this.modloader.version}`,
              `${this.version}-${this.modloader.name}-${this.modloader.version}.json`,
            ),
          );

          this.versionManifest = mergeManifests(
            this.versionManifest,
            forgeVersionManifest,
          );
          break;
        }
        case "neoforge":
          {
            const neoForgeVersionManifest = await readJson<Version>(
              path.join(
                this.paths.versions,
                `${this.modloader.name}-${this.modloader.version}`,
                `${this.modloader.name}-${this.modloader.version}.json`,
              ),
            );

            this.versionManifest = mergeManifests(
              this.versionManifest,
              neoForgeVersionManifest,
            );
          }
          break;
        default:
      }

      const args = await core.arguments.generateLaunchArguments(
        this.versionManifest,
        this.javaLocation,
        this.instanceLocation,
        this.paths.libraries,
        this.paths.assets,
        this.versionLocation,
        this.auth,
        { customGameArgs: this.args.game, customJvmArgs: this.args.java },
      );

      const process = core.launch(args, this.instanceLocation);

      return process;
    } catch (original) {
      const error = new LaunchError(
        {
          version: this.version,
          auth: this.auth,
          paths: this.paths,
          customGameArgs: this.args.game,
          customJvmArgs: this.args.java,
          versionManifest: this.versionManifest,
          modlodaer: this.modloader,
        },
        original,
      );
      error.throw();
    }
  }
}
