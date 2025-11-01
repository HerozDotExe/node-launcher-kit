import path from "path";
import { ensureDir, exists } from "../utils/fs";
import { AssetIndex, PoolFile, Version } from "../utils/types";
import fs from "fs/promises";
import { downloadFile, DownloadPool } from "../utils/fetch";

export async function AssetsDownloader(destination: string, versionManifest: Version) {
  await ensureDir(path.join(destination, "indexes"));
  await ensureDir(path.join(destination, "objects"));

  const assetIndexPath = path.join(
    destination,
    "indexes",
    `${versionManifest.assetIndex.id}.json`,
  );

  if (!(await exists(assetIndexPath))) {
    await downloadFile({
      url: versionManifest.assetIndex.url,
      path: assetIndexPath,
    });
  }

  const assetIndex: AssetIndex = JSON.parse(
    await fs.readFile(assetIndexPath, { encoding: "utf-8" }),
  );

  const files: PoolFile[] = [];

  for (const key in assetIndex.objects) {
    if (Object.prototype.hasOwnProperty.call(assetIndex.objects, key)) {
      const asset = assetIndex.objects[key];

      const subhash = asset.hash.substring(0, 2);
      const assetPath = path.join(destination, "objects", subhash, asset.hash);
      const assetURL = `https://resources.download.minecraft.net/${asset.hash.substring(0, 2)}/${asset.hash}`;

      await ensureDir(path.dirname(assetPath));

      files.push({ url: assetURL, path: assetPath });
    }
  }

  const dPool = new DownloadPool(files, 5);

  return dPool;
}