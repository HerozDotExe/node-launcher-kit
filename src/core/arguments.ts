import path from "path";
import { isNeeded } from "../utils/rules";
import { Argument, Auth, PoolFile, Version } from "../utils/types";
import { getJavaExecutable } from "./java";
import { getLibraries } from "./libraries";
import { version as packageVersion } from "../../package.json";

function fillArguments(
  arg: string,
  versionManifest: Version,
  gameRoot: string,
  classPaths: PoolFile[],
  auth: Auth,
) {
  const argumentsToFill = {
    "${natives_directory}": path.join(gameRoot, "natives"),
    "${launcher_name}": "nlk",
    "${launcher_version}": packageVersion,
    "${classpath}": classPaths,
    "${game_directory}": gameRoot,
    "${version_name}": versionManifest.id,
    "${version_type}": versionManifest.type,
    "${assets_index_name}": versionManifest.assets,
    "${assets_root}": path.join(gameRoot, "assets"),
    "${auth_access_token}": auth.access_token,
    "${auth_session}": auth.access_token,
    "${auth_player_name}": auth.name,
    "${auth_uuid}": auth.uuid,
    "${auth_xuid}": auth.meta?.xuid || auth.access_token,
    "${user_properties}": auth.user_properties,
    "${user_type}": auth.meta?.type || "msa",
    "${clientid}":
      auth.meta?.clientId || auth.client_token || auth.access_token,
  };

  for (const key in argumentsToFill) {
    if (Object.prototype.hasOwnProperty.call(argumentsToFill, key)) {
      const value = argumentsToFill[key];
      arg = arg.replace(key, value);
    }
  }

  return arg;
}

function parseArg(
  this: string[],
  arg: Argument,
  versionManifest: Version,
  gameRoot: string,
  classPaths: PoolFile[],
  auth: Auth,
) {
  if (isNeeded(arg)) {
    if (typeof arg === "string") {
      this.push(
        fillArguments(arg, versionManifest, gameRoot, classPaths, auth),
      );
    } else if (typeof arg.value === "string") {
      this.push(
        fillArguments(arg.value, versionManifest, gameRoot, classPaths, auth),
      );
    } else if (arg.value.length > 1) {
      for (const e of arg.value) {
        this.push(
          fillArguments(e, versionManifest, gameRoot, classPaths, auth),
        );
      }
    }
  }

  return this;
}

function generateClassPaths(versionManifest: Version, librariesRoot: string) {
  const libs = getLibraries(versionManifest, librariesRoot).map(
    (lib) => lib.path,
  );

  libs.push(path.join(librariesRoot, "..", "versions", `${versionManifest.id}.jar`))

  return libs.join(path.delimiter);
}

export function generateLaunchArguments(
  versionManifest: Version,
  javaRoot: string,
  gameRoot: string,
  auth: Auth,
  options = {
    minRam: "2G",
    maxRam: "2G",
    customJvm: "",
  },
) {
  // Log4j /!\
  // Replace templates /!\

  const jvm: string[] = [];
  const game: string[] = [];

  const classPaths = generateClassPaths(
    versionManifest,
    path.join(gameRoot, "libraries"),
  );

  function p(args: string[], arg: Argument) {
    parseArg.apply(args, [arg, versionManifest, gameRoot, classPaths, auth]);
  }

  for (const arg of versionManifest.arguments.jvm) {
    p(jvm, arg);
  }
  for (const arg of versionManifest.arguments.game) {
    p(game, arg);
  }

  return `${getJavaExecutable(javaRoot)} ${jvm.join(" ")}${options.customJvm === "" ? "" : ` ${options.customJvm}`} -Xms${options.minRam} -Xmx${options.maxRam} -XX:+UnlockExperimentalVMOptions -XX:+UseG1GC -XX:G1NewSizePercent=20 -XX:G1ReservePercent=20 -XX:MaxGCPauseMillis=50 -XX:G1HeapRegionSize=32M ${versionManifest.mainClass} ${game.join(" ")}`;
}
