# node-launcher-kit

A typescript library to install and launch minecraft with or without modloaders.

## Features

* Supports installing and launching **vanilla** from 1.0 to 26.1.2
* Supports installing and launching **forge** from 1.7.10 to 26.1.2
* Supports installing and launching **neoforge** from its first version to 26.1.2
* Supports installing and launching **fabric** from its first version to 26.1.2
* Can install and launch **modrinth** modpacks
* Uses **concurrents downloads** to speed up installation process

## Basic Example

You can use this code to install and launch minecraft 1.21.11 with offline auth. This will also automatically download fitting java binaries.

```js
import {Instance, offlineAuth, RuntimeManager, getJavaComponent } from "node-launcher-kit"
import path from "path"

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
p.stdout.on("data", (d) => {
  console.log(d.toString());
});
p.stderr.on("data", (d) => {
  console.log(d.toString());
});
```

> You can look in the tests folder to see more examples showing how to use nlk with fabric, forge, neoforge, and modrinth's modpacks.

## Authentification
You can use [prismarine-auth](https://github.com/PrismarineJS/prismarine-auth) or [MSMC](https://github.com/Hanro50/MSMC) to authentificate with a microsoft account.
*See src/utils/types.ts for Auth type.*

You can use offlineAuth during development.

## Acknowledgments

This project was inspired by [mclc](https://github.com/Pierce01/MinecraftLauncher-core).

`shell.nix` is a modification of [Tomate0613's](https://github.com/Tomate0613/launcher-core/blob/main/flake.nix).
