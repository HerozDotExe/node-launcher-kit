import { expect, test } from "vitest";
import * as nlk from "../dist/index.js";
import fs from "fs/promises";

// ensure same formating
const manifest = JSON.parse(await fs.readFile("./tests/1.21.8.json", { encoding: "utf-8" }));

test("get 1.21.8 version manifest", async () => {
  expect(
    await nlk.core.version.getVersionManifest("1.21.8"),
  ).toStrictEqual(manifest);
});
