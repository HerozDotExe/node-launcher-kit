import { expect, test, vi } from "vitest";
import * as nlk from "../dist/index.js";
import path from "path";
import { hash } from "crypto";
import fs from "fs/promises";

const root = path.join(import.meta.dirname, "temp");
const xmlFile = path.join(root, "client-1.21.2.xml");
try {
  await fs.rm(xmlFile, { recursive: true });
} catch {
  // first time the test is runned
}

// mock os to linux for testing
vi.stubGlobal("process", { platform: "linux" });

test(
  "download xml file and return correct arguments",
  { timeout: 0 },
  async () => {
    const versionManifest = await nlk.core.version.getVersionManifest("1.21.8", root);
    const arg = await nlk.core.log4j.getArgument(versionManifest, root);

    expect(arg, "correct arg returned").toBe(
      `-Dlog4j.configurationFile=${xmlFile}`,
    );

    expect(
      hash("sha1", await fs.readFile(xmlFile, { encoding: "utf-8" })),
      "correct hash",
    ).toBe("39384bd14c0606d812afec88d8aff595b2587dd9");
  },
);
