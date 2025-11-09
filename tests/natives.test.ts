import { expect, test, vi } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import fs from "fs/promises";

const nativesPath = path.join(import.meta.dirname, "temp/natives");
await fs.rm(nativesPath, { recursive: true, force: true });
await fs.mkdir(nativesPath, { recursive: true });

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

// old version because newer versions doesn't have natives
test("download natives for 1.15 correctly", { timeout: 0 }, async () => {
  const versionManifest = await nlk.core.version.getVersionManifest("1.15");
  const nativesDownloader = await nlk.core.NativesDownloader(
    nativesPath,
    versionManifest,
  );
  nativesDownloader.on("completed", () => {
    console.log(
      `${nativesDownloader.done}/${nativesDownloader.total} | ${nativesDownloader.doneSize}/${nativesDownloader.totalSize}`,
    );
  });
  await nativesDownloader.run();

  expect(
    await exists(path.join(nativesPath, "libglfw.so")),
    "libglfw.so exists",
  ).toBe(true);
});
