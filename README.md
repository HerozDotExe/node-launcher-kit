# node-launcher-kit

A node.js library to install and launch minecraft with or without modloaders.

## Example

You can use this code to install and launch minecraft 1.21.11 with offline auth. This will also automatically download fitting java binaries.

```js
const gameRoot = path.join(import.meta.dirname, "mc");

// install the correct java version for 1.21.11
const javaManager = new RuntimeManager(path.join(gameRoot, "java"));
javaManager.on("progress", console.log) // show progress in logs
const java = await javaManager.use(await getJavaComponent("1.21.11"))

// instance's config
const instance = new Instance({
  version: "1.21.11",
  auth: offlineAuth("player"),
  paths: {
    // root is a shared folder by all instances for common game files. reusing the same root makes install faster.
    root: gameRoot,
    // instance is where saves, mods and configs are stored, it is per instance.
    instance: path.join(gameRoot, "instances", "1.21.11")
  },
  javaExecutable: java
});

// show progress and debug info
instance.on("progress", console.log);
instance.on("log", (step, msg) => {
  console.log(`[${step}] ${msg}`)
})

// install the game
await instance.install();

// launch the game, if instance.install already runned once before, you can run instance.launch with the same instance's config without rerunning install.
const p = await instance.launch();

// show minecraft's logs
p.stdout.on("data", (d: Buffer) => {
  console.log(d.toString());
});
p.stderr.on("data", (d: Buffer) => {
  console.log(d.toString());
});
```

> You can look in the tests folder to see more examples showing how to use nlk with fabric, forge, neoforge, and modrinth's modpacks.
