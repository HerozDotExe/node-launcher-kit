import { test } from "vitest";
import { Instance, offlineAuth, RuntimeManager, getJavaComponent } from "../../dist/index.js";
import path from "path";
import fs from "fs/promises";

const gameRoot = path.join(import.meta.dirname, "..", "temp");
await fs.rm(gameRoot, { recursive: true, force: true });
await fs.mkdir(gameRoot, { recursive: true });

test("launch game", { timeout: 0 }, async () => {
  const instance = new Instance();
  const javaManager = new RuntimeManager(path.join(gameRoot, "java"));

  javaManager.on("progress", console.log)

  const java = await javaManager.use(await getJavaComponent("1.21.1"))

  const auth = offlineAuth("player");

  instance.setVersion("1.21.1");
  instance.setPaths(gameRoot);
  instance.setAuth(auth);
  instance.setJavaExecutable(java)
  instance.setModLoader("forge", "52.1.8");

  instance.on("progress", console.log);

  await instance.install();
  const p = await instance.launch();

  p.stdout.on("data", (d: Buffer) => {
    console.log(d.toString());
  });

  p.stderr.on("data", (d: Buffer) => {
    console.log(d.toString());
  });

  await new Promise<void>((res) => {
    p.on("error", (d: Buffer) => {
      console.log(d.toString());
      res();
    });
    p.on("close", () => {
      console.log("closed");
      res();
    });
  });
});
