import path from "path";
import { parseRule } from "../utils/rules";
import { Library, PoolFile, Version } from "../utils/types";
import { DownloadPool } from "../utils/fetch";

export async function download(destination: string, versionManifest: Version) {
  // Download libraries
  const files = versionManifest.libraries.map<PoolFile>((library: Library) => {
    if (!parseRule(library)) {
      return {
        url: library.downloads.artifact.url,
        path: path.join(destination, library.downloads.artifact.path),
      };
    }
  });

  const dPool = new DownloadPool(files, 5);

  await dPool.run();
}
