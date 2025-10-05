import { Library, Native, PoolFile, Version } from "../utils/types";
import path from "path";
import { ensureDir } from "../utils/fs";
import { parseRule } from "../utils/rules";
import { os } from "../utils/systemInfo";
import { DownloadPool } from "../utils/fetch";
import { getTempFolder } from "../utils/temp";
import { unzipAll } from "../utils/unzip";

export async function download(destination: string, versionManifest: Version) {
  const nativesPath = path.join(destination);
  await ensureDir(nativesPath);
  const tempNativesPath = await getTempFolder("natives");

  // Download archives to a temp folder
  const files = versionManifest.libraries.map<PoolFile>((library: Library) => {
    if (library.downloads && library.downloads.classifiers) {
      if (parseRule(library)) return null;

      const native: Native =
        os() === "osx"
          ? library.downloads.classifiers["natives-osx"] ||
            library.downloads.classifiers["natives-macos"]
          : library.downloads.classifiers[`natives-${os()}`];

      const name = native.path.split("/").pop();

      return { url: native.url, path: path.join(tempNativesPath, name) };
    }
  });

  const dPool = new DownloadPool(files, 5);

  await dPool.run();

  // Extract every archives into the natives folder
  for (const key in files) {
    if (Object.prototype.hasOwnProperty.call(files, key)) {
      const file = files[key];
      if (file) unzipAll(file.path, nativesPath);
    }
  }

  // for (const key in versionManifest.libraries) {
  //   if (Object.prototype.hasOwnProperty.call(versionManifest.libraries, key)) {
  //     const library = versionManifest.libraries[key];

  //     if (library.downloads && library.downloads.classifiers) {
  //       if (parseRule(library)) continue;

  //       const native: Native =
  //         this.getOS() === "osx"
  //           ? library.downloads.classifiers["natives-osx"] ||
  //             library.downloads.classifiers["natives-macos"]
  //           : library.downloads.classifiers[`natives-${os()}`];

  //       const name = native.path.split("/").pop();
  //     }
  //   }
  // }
}
