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

export async function download(
  os: RuntimeOS,
  component: RuntimeComponent,
  destination: string,
  signal?: AbortController,
) {
  const javaRuntimesManifests = await fetchJson<JavaRuntimesManifests>(
    "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
  );
  const javaRuntimeManifest = (
    await fetchJson<FilesList>(
      javaRuntimesManifests[os][component][0].manifest.url,
    )
  ).files;

  const files: PoolFile[] = [];

  for (const key in javaRuntimeManifest) {
    if (Object.prototype.hasOwnProperty.call(javaRuntimeManifest, key)) {
      const element = javaRuntimeManifest[key];
      if (element.type === "file") {
        files.push({
          url: element.downloads.raw.url,
          path: path.join(destination, key),
        });
      } else if (element.type === "directory") {
        await fs.mkdir(path.join(destination, key));
      }
    }
  }

  const dPool = new DownloadPool(files, 5);

  await dPool.run();

  if (process.platform !== "win32") {
    await fs.chmod(path.join(destination, "bin/java"), 0o777);
  }
}
