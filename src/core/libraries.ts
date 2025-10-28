import path from "path";
import { isNeeded } from "../utils/rules";
import { PoolFile, Version } from "../utils/types";
import { DownloadPool } from "../utils/fetch";

export function getLibraries(versionManifest: Version, librariesRoot: string) {
  const libs: PoolFile[] = [];

  for (const key in versionManifest.libraries) {
    if (Object.prototype.hasOwnProperty.call(versionManifest.libraries, key)) {
      const library = versionManifest.libraries[key];
      if (isNeeded(library)) {
        libs.push({
          url: library.downloads.artifact.url,
          path: path.join(librariesRoot, library.downloads.artifact.path),
        });
      }
    }
  }
  
  return libs
}

export async function download(librariesRoot: string, versionManifest: Version) {
  const libs = getLibraries(versionManifest, librariesRoot);
  // Download libraries
  const dPool = new DownloadPool(libs, 5);

  await dPool.run();

  return libs;
}
