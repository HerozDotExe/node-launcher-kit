import path from "path";
import { isNeeded } from "../utils/rules";
import { Argument, Auth, PoolFile, Version } from "../utils/types";
import { getJavaExecutable } from "./java";
import { getLibraries } from "./libraries";
import { version as packageVersion } from "../../package.json";
import { getArgument } from "./log4j";

function fillArguments(
  arg: string,
  versionManifest: Version,
  assetsPath: string,
  instancePath: string,
  librariesPath: string,
  classPaths: PoolFile[],
  auth: Auth,
) {
  const argumentsToFill = {
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

  console.log(arg)

  return arg;
}

function parseArg(
  this: string[],
  arg: Argument,
  versionManifest: Version,
  assetsPath: string,
  instancePath: string,
  librariesPath: string,
  classPaths: PoolFile[],
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
  javaRoot: string,
  instancePath: string,
  librariesPath: string,
  assetsPath: string,
  versionRoot: string,
  auth: Auth,
  options: {
    minRam?: string;
    maxRam?: string;
    customJvmArgs?: string;
    customGameArgs?: string;
  },
) {
  // Log4j /!\
  // Replace templates /!\

  const jvm: string[] = [];
  const game: string[] = [];

  const classPaths = generateClassPaths(
    versionManifest,
    librariesPath,
    path.join(versionRoot, `${versionManifest.id}.jar`),
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

  for (const arg of versionManifest.arguments.jvm) {
    p(jvm, arg);
  }
  for (const arg of versionManifest.arguments.game) {
    p(game, arg);
  }

  if (options.customJvmArgs !== "") {
    for (const arg of options.customJvmArgs.split(" ")) {
      jvm.push(arg);
    }
  }

  if (options.customGameArgs !== "") {
    for (const arg of options.customGameArgs.split(" ")) {
      game.push(arg);
    }
  }

  const log4j = await getArgument(versionManifest, versionRoot);

  return {
    command: getJavaExecutable(javaRoot),
    args: [
      ...jvm,
      `-Xms${options.minRam || "2G"}`,
      `-Xmx${options.maxRam || "2G"}`,
      "-XX:+UnlockExperimentalVMOptions",
      "-XX:+UseG1GC",
      "-XX:G1NewSizePercent=20",
      "-XX:G1ReservePercent=20",
      "-XX:MaxGCPauseMillis=50",
      "-XX:G1HeapRegionSize=32M",
      log4j,
      versionManifest.mainClass,
      ...game,
    ],
  };
}
