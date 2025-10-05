import { test } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import fs from "fs/promises";

const nativesPath = path.join(import.meta.dirname, "temp/natives");
console.log(nativesPath)
await fs.rm(nativesPath, { recursive: true, force: true });
await fs.mkdir(nativesPath, { recursive: true });

// old version because newer versions doesn't have natives
test(
  "download natives for 1.15 correctly",
  { timeout: 10000 },
  async () => {
    const versionManifest = await nlk.core.version.getVersionManifest("1.15");
    await nlk.core.natives.download(nativesPath, versionManifest);
  },
);
