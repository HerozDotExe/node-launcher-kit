import path from "path";
import { isNeeded } from "../utils/rules";
import { Argument, Auth, Version } from "../utils/types";
import { getLibraries } from "./libraries";
import { version as packageVersion } from "../../package.json";
import { getArgument } from "./log4j";

// Fill templates
function fillArguments(
  arg: string,
  versionManifest: Version,
  assetsPath: string,
  instancePath: string,
  librariesPath: string,
  classPaths: string,
  auth: Auth,
) {
  const argumentsToFill: { [key: string]: string } = {
    "${natives_directory}": path.join(instancePath, "natives"),
    "${launcher_name}": "nlk",
    "${launcher_version}": packageVersion,
    "${classpath}": classPaths,
    "${library_directory}": librariesPath,
    "${game_directory}": instancePath,
    "${version_name}": versionManifest.id,
    "${version_type}": versionManifest.type,
    "${assets_index_name}": versionManifest.assets,
    "${assets_root}": assetsPath,
    "${game_assets}": assetsPath,
    "${auth_access_token}": auth.access_token,
    "${auth_session}": auth.access_token,
    "${auth_player_name}": auth.name,
    "${auth_uuid}": auth.uuid,
    "${auth_xuid}": auth.meta?.xuid || auth.access_token,
    "${user_properties}": auth.user_properties,
    "${user_type}": auth.meta?.type || "msa",
    "${clientid}":
      auth.meta?.clientId || auth.client_token || auth.access_token,
    "${classpath_separator}": path.delimiter,
  };

  for (const key in argumentsToFill) {
    if (Object.prototype.hasOwnProperty.call(argumentsToFill, key)) {
      const value = argumentsToFill[key];
      arg = arg.replaceAll(key, value);
    }
  }

  return arg;
}

// Check if each arg is needed and fill templates
function parseArg(
  this: string[],
  arg: Argument,
  versionManifest: Version,
  assetsPath: string,
  instancePath: string,
  librariesPath: string,
  classPaths: string,
  auth: Auth,
) {
  if (isNeeded(arg)) {
    if (typeof arg === "string") {
      this.push(
        fillArguments(
          arg,
          versionManifest,
          assetsPath,
          instancePath,
          librariesPath,
          classPaths,
          auth,
        ),
      );
    } else if (typeof arg.value === "string") {
      this.push(
        fillArguments(
          arg.value,
          versionManifest,
          assetsPath,
          instancePath,
          librariesPath,
          classPaths,
          auth,
        ),
      );
    } else if (arg.value.length > 1) {
      for (const e of arg.value) {
        this.push(
          fillArguments(
            e,
            versionManifest,
            assetsPath,
            instancePath,
            librariesPath,
            classPaths,
            auth,
          ),
        );
      }
    }
  }

  return this;
}

function generateClassPaths(
  versionManifest: Version,
  librariesRoot: string,
  versionJar: string,
) {
  const libs = getLibraries(versionManifest, librariesRoot).map(
    (lib) => lib.path,
  );

  libs.push(versionJar);

  return libs.join(path.delimiter);
}

export async function generateLaunchArguments(
  versionManifest: Version,
  javaExecutable: string,
  instancePath: string,
  librariesPath: string,
  assetsPath: string,
  versionRoot: string,
  auth: Auth,
  customArgs: { java: string; game: string },
  ram: { max: string; min: string },
) {
  const jvm: string[] = [];
  let game: string[] = [];

  const versionJar = path.join(versionRoot, `${versionManifest.id}.jar`);

  const classPaths = generateClassPaths(
    versionManifest,
    librariesPath,
    versionJar,
  );

  function p(args: string[], arg: Argument) {
    parseArg.apply(args, [
      arg,
      versionManifest,
      assetsPath,
      instancePath,
      librariesPath,
      classPaths,
      auth,
    ]);
  }

  if (versionManifest.arguments) {
    for (const arg of versionManifest.arguments.jvm) {
      p(jvm, arg);
    }
    for (const arg of versionManifest.arguments.game) {
      p(game, arg);
    }
  } else {
    console.log(versionManifest.minecraftArguments)
    game = fillArguments(
      versionManifest.minecraftArguments,
      versionManifest,
      assetsPath,
      instancePath,
      librariesPath,
      classPaths,
      auth,
    ).split(" ");

    jvm.push(`-Djava.library.path=${path.join(instancePath, "natives")}`);
    jvm.push(`-Dminecraft.launcher.brand=nlk`);
    jvm.push(`-Dminecraft.launcher.version=${packageVersion}`);
    jvm.push(
      `-Dminecraft.client.jar=${path.join(versionRoot, `${versionManifest.id}.jar`)}`,
    );
    jvm.push("-cp");
    jvm.push(classPaths)
  }

  if (customArgs.java !== "") {
    for (const arg of customArgs.java.split(" ")) {
      jvm.push(arg);
    }
  }

  if (customArgs.game !== "") {
    for (const arg of customArgs.game.split(" ")) {
      game.push(arg);
    }
  }

  const log4j = await getArgument(versionManifest, versionRoot);

  let launchArguments = [
    ...jvm,
    `-Xms${ram.min}`,
    `-Xmx${ram.max}`,
    "-XX:+UnlockExperimentalVMOptions",
    "-XX:+UseG1GC",
    "-XX:G1NewSizePercent=20",
    "-XX:G1ReservePercent=20",
    "-XX:MaxGCPauseMillis=50",
    "-XX:G1HeapRegionSize=32M",
  ]

  if (log4j) {
    launchArguments.push(log4j)
  }

  launchArguments = [...launchArguments, versionManifest.mainClass, ...game,]

  return {
    command: javaExecutable,
    args: launchArguments,
  };
}
