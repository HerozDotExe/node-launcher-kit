import { expect, test, vi } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import fs from "fs/promises";

const root = path.join(import.meta.dirname, "temp");
try {
  await fs.rm(path.join(root, "1.21.8.json"));
  await fs.rm(path.join(root, "1.21.8.jar"));
} catch (e) {
  console.warn(e)
}

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

test("parse arguments correctly for 1.21.8", { timeout: 0 }, async () => {
  const versionManifest = await nlk.core.version.getVersionManifest(
    "1.21.8",
    root,
  );
  await nlk.core.version.downloadJar(versionManifest, root);

  expect(
    await exists(path.join(root, `${versionManifest.id}.jar`)),
    "check jar file",
  ).toBe(true);
  expect(
    await exists(path.join(root, `${versionManifest.id}.json`)),
    "check json file",
  ).toBe(true);
});
