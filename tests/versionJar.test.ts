import { expect, test, vi } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import fs from "fs/promises";

const versionsPath = path.join(import.meta.dirname, "temp/versions");
await fs.rm(versionsPath, { recursive: true });
await fs.mkdir(versionsPath, { recursive: true });

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
  const versionManifest = await nlk.core.version.getVersionManifest("1.21.8");
  await nlk.core.version.downloadJar(
    versionManifest,
    path.join(versionsPath, ".."),
  );

  expect(
    await exists(path.join(versionsPath, `${versionManifest.id}.jar`)),
    "check jar file",
  ).toBe(true);
});
