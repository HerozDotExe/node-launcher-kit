import { test } from "vitest";
import { Instance, offlineAuth } from "../../../dist/index.js";
import path from "path";
import fs from "fs/promises";

const gameRoot = path.join(import.meta.dirname, "..", "temp");
await fs.rm(gameRoot, { recursive: true, force: true });
await fs.mkdir(gameRoot, { recursive: true });

test("launch game", { timeout: 0 }, async () => {
  const instance = new Instance();

  const auth = offlineAuth("player");

  instance.setVersion("1.21.8");
  instance.setPaths(gameRoot);
  instance.setAuth(auth);

  instance.on("progress", console.log);

  await instance.install();
  const p = await instance.launch();

  p.stdout.on("data", (d: Buffer) => {
    console.log(d.toString());
  });

  p.on("error", (d: Buffer) => {
    console.log(d.toString());
  });

  await new Promise<void>((res) => {
    p.on("close", () => {
      console.log("closed");
      res();
    });
  });
});
