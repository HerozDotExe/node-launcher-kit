import path from "path";
import { DownloadPool, fetchJson } from "../utils/fetch";
import fs from "fs/promises";
import {
  FilesList,
  InstanceEvents,
  JavaRuntimesManifests,
  PoolFile,
  RuntimeComponent,
  RuntimeOS,
} from "../utils/types";
import { ensureDir } from "../utils/fs";
import { EventEmitter } from "stream";
import { exec } from "child_process";
import { arch, os } from "../utils/systemInfo";
import { InstallError } from "../utils/errors";
import { getVersionManifest } from "../core/version";
import { getTempFolder } from "../utils/temp";

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

export function checkJava(javaExecutable: string) {
  return new Promise<Error | void>((res) => {
    exec(`${javaExecutable} -version`, (err) => {
      if (err) {
        res(err)
      } else {
        res();
      }
    });
  });
}

export function getJavaExecutable(javaRoot: string, show = false) {
  const executable = `${os() === "windows" && show ? "javaw" : "java"}${os() === "windows" ? ".exe" : ""}`;
  return path.join(javaRoot, "bin", executable);
}

async function JavaDownloader(
  os: RuntimeOS,
  component: RuntimeComponent,
  rootDestination: string,
) {
  const javaRuntimesManifests = await fetchJson<JavaRuntimesManifests>(
    "https://piston-meta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
  );
  const javaRuntimeManifest = (
    await fetchJson<FilesList>(
      javaRuntimesManifests[os][component][0].manifest.url,
    )
  ).files;

  const componentDestination = path.join(rootDestination, component);
  await ensureDir(componentDestination, true);

  const files: PoolFile[] = [];

  for (const key in javaRuntimeManifest) {
    if (Object.prototype.hasOwnProperty.call(javaRuntimeManifest, key)) {
      const element = javaRuntimeManifest[key];
      if (element.type === "file") {
        files.push({
          url: element.downloads!.raw.url,
          path: path.join(componentDestination, key),
          size: element.downloads!.raw.size,
        });
      } else if (element.type === "directory") {
        await ensureDir(path.join(componentDestination, key), true);
      }
    }
  }

  const pool = new DownloadPool(files, {
    pQueueOptions: { concurrency: 5 },
    cleanup: async () => {
      if (process.platform !== "win32") {
        await fs.chmod(path.join(componentDestination, "bin/java"), 0o777);
      }
    },
  });

  return pool;
}

export async function getJavaComponent(mcVersion: string, versionsRoot?: string) {
  if(!versionsRoot) {
    versionsRoot = await getTempFolder("nlk-versions-cache")
  }

  const versionManifest = await getVersionManifest(mcVersion, versionsRoot);
  
  return versionManifest.javaVersion.component
}

export class RuntimeManager extends EventEmitter<InstanceEvents> {
  runtimesRoot: string

  constructor(runtimesRoot: string) {
    super();
    this.runtimesRoot = runtimesRoot
  }

  async use(component: RuntimeComponent) {
    await ensureDir(this.runtimesRoot, true);

    const javaExecutable = getJavaExecutable(path.join(this.runtimesRoot, component))

    const javaError = await checkJava(javaExecutable);

    if (javaError) {
      try {
        const javaDownloader = await JavaDownloader(
          getJavaOs(),
          component,
          this.runtimesRoot,
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

    return javaExecutable
  }
}

/* 
  function launch(javaLoc: string) {...} // dummy launch function

  const javaManager = new JavaManager(runtimesRoot)

  javaManager.on("progress", console.log) // show progress to user

  launch(javaManager.use(getJavaComponent("1.21.8")))
*/