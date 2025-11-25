import { expect, test, vi } from "vitest";
import * as nlk from "../../dist/index.js";
import path from "path";
import fs from "fs/promises";

const assetsPath = path.join(import.meta.dirname, "temp/assets");
const root = path.join(import.meta.dirname, "temp");
await fs.rm(assetsPath, { recursive: true, force: true });
await fs.mkdir(assetsPath, { recursive: true });

async function exists(path: string) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// mock os to linux for testing
vi.stubGlobal("process", { platform: "linux" });

test(
  "download assets for 1.21.8 correctly",
  { timeout: 0 },
  async () => {
    const versionManifest = await nlk.core.version.getVersionManifest("1.21.8", root);
    const assetsDownloader = await nlk.core.AssetsDownloader(assetsPath, versionManifest);
    assetsDownloader.on("completed", () => {
      console.log(
        `${assetsDownloader.done}/${assetsDownloader.total} | ${assetsDownloader.doneSize}/${assetsDownloader.totalSize}`,
      );
    });
    await assetsDownloader.run()


    expect(
      await exists(path.join(assetsPath, "objects", "00", "00c9fa8115347fb0220aaf72a8d7d921f5354112")),
      "objects/00/00c9fa8115347fb0220aaf72a8d7d921f5354112 exists",
    ).toBe(true);
  },
);
