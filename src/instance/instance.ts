import { Auth, Paths, Version } from "../utils/types";
import * as core from "../core";
import path from "path";
import { os, arch } from "../utils/systemInfo";

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

export class Instance {
  version: string;
  modLoader: { name: string; version: string };
  auth: Auth;
  paths: Paths;
  args: { java: string; game: string };
  versionManifest: Version;

  constructor() {
    this.args = { java: "", game: "" };
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
        java: path.join(paths, "java"),
        libraries: path.join(paths, "libraries"),
        natives: path.join(paths, "natives"),
      };
    } else {
      this.paths = {
        root: paths.root,
        version: paths.version || path.join(paths.root, "version", this.version),
        assets: paths.assets || path.join(paths.root, "assets"),
        java: paths.java || path.join(paths.root, "java"),
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

  async install() {
    this.versionManifest = await core.version.getVersionManifest(
      this.version,
      this.paths.version,
    );
    await core.version.downloadJar(this.versionManifest, this.paths.version);

    const librariesDownloader = await core.LibrariesDownloader(
      this.paths.libraries,
      this.versionManifest,
    );
    librariesDownloader.on("completed", () => {
      console.log(
        `${librariesDownloader.done}/${librariesDownloader.total} | ${librariesDownloader.doneSize}/${librariesDownloader.totalSize}`,
      );
    });
    await librariesDownloader.run();

    const assetsDownloader = await core.AssetsDownloader(
      this.paths.assets,
      this.versionManifest,
    );
    assetsDownloader.on("completed", () => {
      console.log(
        `${assetsDownloader.done}/${assetsDownloader.total} | ${assetsDownloader.doneSize}/${assetsDownloader.totalSize}`,
      );
    });
    await assetsDownloader.run();

    const nativesDownloader = await core.NativesDownloader(
      this.paths.natives,
      this.versionManifest,
    );
    nativesDownloader.on("completed", () => {
      console.log(
        `${nativesDownloader.done}/${nativesDownloader.total} | ${nativesDownloader.doneSize}/${nativesDownloader.totalSize}`,
      );
    });
    await nativesDownloader.run();

    const javaDownloader = await core.java.JavaDownloader(
      getJavaOs(),
      this.versionManifest.javaVersion.component,
      this.paths.java,
    );
    javaDownloader.on("completed", () => {
      console.log(
        `${javaDownloader.done}/${javaDownloader.total} | ${javaDownloader.doneSize}/${javaDownloader.totalSize}`,
      );
    });
    await javaDownloader.run();
  }

  async launch() {
    const args = await core.arguments.generateLaunchArguments(
      await core.version.getVersionManifest(this.version, this.paths.version),
      this.paths.java,
      this.paths.root,
      this.paths.version,
      this.auth,
      { customGameArgs: this.args.game, customJvmArgs: this.args.java },
    );

    const process = core.launch(args, this.paths.root);

    return process;
  }
}
