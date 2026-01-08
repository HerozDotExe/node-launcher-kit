import path from "path";
import { DownloadPool, fetchJson } from "../utils/fetch";
import fs from "fs/promises";
import {
  FilesList,
  JavaRuntimesManifests,
  PoolFile,
  RuntimeComponent,
  RuntimeOS,
} from "../utils/types";
import { os } from "../utils/systemInfo";
import { ensureDir } from "../utils/fs";

export function getJavaExecutable(javaRoot: string, show = false) {
  const executable = `${os() === "windows" && show ? "javaw" : "java"}${os() === "windows" ? ".exe" : ""}`;
  return path.join(javaRoot, "bin", executable);
}

export async function JavaDownloader(
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
          url: element.downloads.raw.url,
          path: path.join(componentDestination, key),
          size: element.downloads.raw.size,
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
