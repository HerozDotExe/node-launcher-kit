import { Native, PoolFile, Version } from "../utils/types";
import path from "path";
import { ensureDir } from "../utils/fs";
import { isNeeded } from "../utils/rules";
import { os } from "../utils/systemInfo";
import { getTempFolder } from "../utils/temp";
import { DownloadAndUnzipPool } from "../utils/unzip";

async function getNatives(versionManifest: Version, tempNativesPath: string) {
  const files: PoolFile[] = [];

  for (const key in versionManifest.libraries) {
    if (Object.prototype.hasOwnProperty.call(versionManifest.libraries, key)) {
      const library = versionManifest.libraries[key];
      if (library.downloads && library.downloads.classifiers) {
        if (!isNeeded(library)) continue;

        const native: Native =
          os() === "osx"
            ? library.downloads.classifiers["natives-osx"] ||
              library.downloads.classifiers["natives-macos"]
            : library.downloads.classifiers[`natives-${os()}`];

        const destination = path.join(
          tempNativesPath,
          path.basename(native.path),
        );

        files.push({ url: native.url, path: destination, size: native.size });
      }
    }
  }

  return files;
}

export async function NativesDownloader(
  nativesPath: string,
  versionManifest: Version,
) {
  await ensureDir(nativesPath, true);
  const tempNativesPath = await getTempFolder("natives");

  const natives = await getNatives(versionManifest, tempNativesPath);

  const pool = new DownloadAndUnzipPool(natives, nativesPath, tempNativesPath, {
    concurrency: 5,
  });

  return pool;
}
