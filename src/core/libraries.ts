import path from "path";
import { isNeeded } from "../utils/rules";
import { PoolFile, Version } from "../utils/types";
import { DownloadPool } from "../utils/fetch";

export function getLibraries(versionManifest: Version, librariesRoot: string) {
  const libs: PoolFile[] = [];

  for (const key in versionManifest.libraries) {
    if (Object.prototype.hasOwnProperty.call(versionManifest.libraries, key)) {
      const library = versionManifest.libraries[key];
      if (library.downloads) {
        if (isNeeded(library) && library.downloads.artifact) {
          libs.push({
            url: library.downloads.artifact.url,
            path: path.join(librariesRoot, library.downloads.artifact.path),
            size: library.downloads.artifact.size,
          });
        }
      } else {
        // forge lib ?
        if (!library.rules && !library.downloads && !library.natives) {
          const parsedLib = library.name.split(":")
          const libPath = path.join(parsedLib[0].replaceAll(".", "/"), parsedLib[1], parsedLib[2], `${parsedLib[1]}-${parsedLib[2]}.jar`)
          libs.push({
            url: "",
            path: path.join(librariesRoot, libPath),
            size: 0,
          });
        }
      }
    }
  }

  return libs;
}

export async function LibrariesDownloader(
  librariesRoot: string,
  versionManifest: Version,
) {
  const libs = getLibraries(versionManifest, librariesRoot);

  const dPool = new DownloadPool(libs, {
    pQueueOptions: { concurrency: 5 },
    overwrite: false,
  });

  return dPool;
}
