import { Auth, Paths, Version } from "../utils/types";
import * as core from "../core";
import path from "path";
import { os, arch } from "../utils/systemInfo";
import { EventEmitter } from "node:events";
import { InstallError, LaunchError } from "../utils/errors";

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
  modLoader: { name: string; version: string };
  auth: Auth;
  paths: Paths;
  args: { java: string; game: string };
  versionManifest: Version;
  javaLocation?: string;
  ready: boolean;

  constructor() {
    super();
    this.args = { java: "", game: "" };
    this.ready = false;
  }

  setVersion(version: string) {
    this.version = version;
  }

  setModLoader(name: string, version: string) {
    this.modLoader = { name, version };
  }

  setPaths(paths: string);
  setPaths(paths: Paths);
  setPaths(paths: Paths | string) {
    if (typeof paths === "string") {
      this.paths = {
        root: paths,
        version: path.join(paths, "version", this.version),
        assets: path.join(paths, "assets"),
        javaRoot: path.join(paths, "java"),
        libraries: path.join(paths, "libraries"),
        natives: path.join(paths, "natives"),
      };
    } else {
      this.paths = {
        root: paths.root,
        version:
          paths.version || path.join(paths.root, "version", this.version),
        assets: paths.assets || path.join(paths.root, "assets"),
        javaRoot: paths.javaRoot || path.join(paths.root, "java"),
        libraries: paths.libraries || path.join(paths.root, "libraries"),
        natives: paths.natives || path.join(paths.root, "natives"),
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
    this.versionManifest = await core.version.getVersionManifest(
      this.version,
      this.paths.version,
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
      await core.version.downloadJar(this.versionManifest, this.paths.version);
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
        this.paths.natives,
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

      const args = await core.arguments.generateLaunchArguments(
        await core.version.getVersionManifest(this.version, this.paths.version),
        this.javaLocation,
        this.paths.root,
        this.paths.version,
        this.auth,
        { customGameArgs: this.args.game, customJvmArgs: this.args.java },
      );

      const process = core.launch(args, this.paths.root);

      return process;
    } catch (original) {
      const error = new LaunchError(
        {
          version: this.version,
          versionPath: this.paths.version,
          javaLocation: this.javaLocation,
          rootPath: this.paths.root,
          auth: this.auth,
          customGameArgs: this.args.game,
          customJvmArgs: this.args.java,
        },
        original,
      );
      error.throw();
    }
  }
}
