import { expect, test, vi } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import fs from "fs/promises";

const librariesPath = path.join(import.meta.dirname, "temp/libraries");
await fs.rm(librariesPath, { recursive: true, force: true });
await fs.mkdir(librariesPath, { recursive: true });

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
  "download libraries for 1.21.8 correctly",
  { timeout: 10000 },
  async () => {
    const versionManifest = await nlk.core.version.getVersionManifest("1.21.8");
    await nlk.core.libraries.download(librariesPath, versionManifest);

    expect(
      await exists(path.join(librariesPath, "com/fasterxml/jackson/core/jackson-core/2.13.4/jackson-core-2.13.4.jar")),
      "com/fasterxml/jackson/core/jackson-core/2.13.4/jackson-core-2.13.4.jar exists",
    ).toBe(true);
  },
);
