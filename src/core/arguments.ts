import path from "path";
import { isNeeded } from "../utils/rules";
import { Argument, Version, Config } from "../utils/types";
import { getLibraries } from "./libraries";
import { version as packageVersion } from "../../package.json";
import { getArgument } from "./log4j";

// Fill templates
function fillArguments(
  arg: string,
  versionManifest: Version,
  config: Config,
  classPaths: string
) {
  const argumentsToFill: { [key: string]: string } = {
    "${natives_directory}": path.join(config.paths.instance, "natives"),
    "${launcher_name}": "nlk",
    "${launcher_version}": packageVersion,
    "${classpath}": classPaths,
    "${library_directory}": config.paths.libraries,
    "${game_directory}": config.paths.instance,
    "${version_name}": versionManifest.id,
    "${version_type}": versionManifest.type,
    "${assets_index_name}": versionManifest.assets,
    "${assets_root}": config.paths.assets,
    "${game_assets}": config.paths.assets,
    "${auth_access_token}": config.auth.access_token,
    "${auth_session}": config.auth.access_token,
    "${auth_player_name}": config.auth.name,
    "${auth_uuid}": config.auth.uuid,
    "${auth_xuid}": config.auth.meta?.xuid || config.auth.access_token,
    "${user_properties}": config.auth.user_properties,
    "${user_type}": config.auth.meta?.type || "msa",
    "${clientid}":
      config.auth.meta?.clientId || config.auth.client_token || config.auth.access_token,
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
  config: Config,
  classPaths: string
) {
  if (isNeeded(arg)) {
    if (typeof arg === "string") {
      this.push(
        fillArguments(
          arg,
          versionManifest,
          config,
          classPaths
        ),
      );
    } else if (typeof arg.value === "string") {
      this.push(
        fillArguments(
          arg.value,
          versionManifest,
          config,
          classPaths
        )
      )
    } else if (arg.value.length > 1) {
      for (const e of arg.value) {
        this.push(
          fillArguments(
            e,
            versionManifest,
            config,
            classPaths
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
  config: Config
) {
  const jvm: string[] = [];
  let game: string[] = [];

  const versionJar = path.join(config.paths.versions, versionManifest.id, `${versionManifest.id}.jar`);

  const classPaths = generateClassPaths(
    versionManifest,
    config.paths.libraries,
    versionJar,
  );

  function p(args: string[], arg: Argument) {
    parseArg.apply(args, [
      arg,
      versionManifest,
      config,
      classPaths,
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
    game = fillArguments(
      versionManifest.minecraftArguments!,
      versionManifest,
      config,
      classPaths
    ).split(" ");

    jvm.push(`-Djava.library.path=${path.join(config.paths.instance, "natives")}`);
    jvm.push(`-Dminecraft.launcher.brand=nlk`);
    jvm.push(`-Dminecraft.launcher.version=${packageVersion}`);
    jvm.push(
      `-Dminecraft.client.jar=${path.join(config.paths.versions, versionManifest.id, `${versionManifest.id}.jar`)}`,
    );
    jvm.push("-cp");
    jvm.push(classPaths)
  }

  if (config.args.java !== "") {
    for (const arg of config.args.java.split(" ")) {
      jvm.push(arg);
    }
  }

  if (config.args.game !== "") {
    for (const arg of config.args.game.split(" ")) {
      game.push(arg);
    }
  }

  const log4j = await getArgument(versionManifest, config.paths.versions);

  let launchArguments = [
    ...jvm,
    `-Xms${config.ram.min}`,
    `-Xmx${config.ram.max}`,
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
    command: config.javaExecutable,
    args: launchArguments,
  };
}
