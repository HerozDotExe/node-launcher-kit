import { test } from "vitest";
import { Instance, offlineAuth, RuntimeManager, getJavaComponent, importModrinthModpack } from "../../dist/index.js";
import path from "path";
import fs from "fs/promises";

const gameRoot = path.join(import.meta.dirname, "..", "temp");
// await fs.rm(gameRoot, { recursive: true, force: true });
// await fs.mkdir(gameRoot, { recursive: true });

test("launch game", { timeout: 0, tags: ["full", "modrinth"] }, async () => {
  const javaManager = new RuntimeManager(path.join(gameRoot, "java"));
  javaManager.on("progress", console.log)
  // const java = await javaManager.use(await getJavaComponent("${version}"))

  const instance = new Instance({
      auth: offlineAuth("player"),
      paths: { root: gameRoot, instance: path.join(gameRoot, "instances", "Fabulously.Optimized-v12.0.7") },
      javaExecutable: "/nix/store/wrf2p3qb5sycka2y4nnl7pdm8h6zpcin-openjdk-21.0.10+7/bin/java",
      ram: {max:"4G",min:"4G"}
    },
    await importModrinthModpack("/home/heroz/Downloads/Fabulously.Optimized-v12.0.7.mrpack", "file")
  );

  instance.on("progress", console.log);
  instance.on("log", (step, msg) => {
    console.log(`[${step}] ${msg}`)
  })

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
