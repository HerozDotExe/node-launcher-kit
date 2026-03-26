import path from "path";
import { downloadFile, fetchJson } from "../utils/fetch";
import { getTempFolder } from "../utils/temp";
import { LauncherProfiles, logger, Modloader, FabricInstallerMeta } from "../utils/types";
import fs from "fs/promises";
import { spawn } from "child_process";
import { version as packageVersion } from "../../package.json";
import { ensureDir, exists, readJson } from "../utils/fs";
import { InstallError } from "../utils/errors";
import AdmZip from "adm-zip";
import { Config } from "../launcher/instance";

const versionWithDoubleName = ["1.9.4", "1.9.0", "1.8.9", "1.8.8", "1.8", "1.7.10"]
export function fixVersionWithDoubleName(version: string, modloader: Modloader) {
  let modLoaderVersion = modloader.version
  if (versionWithDoubleName.includes(version)) {
    // these versions have a different file name on forge's maven
    modLoaderVersion = modloader.version + `-${version}`
  }
  return modLoaderVersion
}

export interface ModloaderConfig extends Config {
  modloader: Modloader
}

async function downloadJar(
  config: ModloaderConfig,
  type: "universal" | "installer",
  destination: string,
  logger: logger
) {
  let filePath = "";
  try {
    if (config.modloader.name === "forge") {
      if (type === "universal") {
        filePath = path.join(
          destination,
          `forge-${config.version}-${config.modloader.version}-universal.jar`,
        );
        await downloadFile({
          url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${config.version}-${config.modloader.version}/forge-${config.version}-${config.modloader.version}-universal.jar`,
          path: filePath,
        });
      } else {
        filePath = path.join(
          destination,
          `forge-${config.version}-${config.modloader.version}-installer.jar`,
        );
        await downloadFile({
          url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${config.version}-${config.modloader.version}/forge-${config.version}-${config.modloader.version}-installer.jar`,
          path: filePath,
        });
      }
    } else if (config.modloader.name === "neoforge") {
      filePath = path.join(
        destination,
        `neoforge-${config.modloader.version}-installer.jar`,
      );
      await downloadFile({
        url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${config.modloader.version}/neoforge-${config.modloader.version}-installer.jar`,
        path: filePath,
      });
    } else if (config.modloader.name === "fabric") {
      const fabricInstaller = (await fetchJson<FabricInstallerMeta>("https://meta.fabricmc.net/v2/versions/installer")).find(i => i.stable)
      if (!fabricInstaller) {
        throw new Error("Couldn't download fabric installer")
      }

      filePath = path.join(
        destination,
        `fabric-installer-${fabricInstaller.version}.jar`,
      );

      await downloadFile({
        url: fabricInstaller.url,
        path: filePath,
      });
    }
  } catch (error) {
    throw new InstallError("An error occured while downloadng natives", "natives", config, logger, { cause: error })
  }

  console.log(filePath)
  return filePath;
}

async function setupFakeLauncher() {
  const tempFolder = await getTempFolder("modloaders");
  const fakeLauncher = path.join(tempFolder, "fakeLauncher");

  await fs.mkdir(path.join(fakeLauncher, "versions"), { recursive: true })
  await fs.writeFile(path.join(fakeLauncher, "launcher_profiles.json"), `{"profiles":{}}`);

  return tempFolder
}

export function runForgeInstaller(
  javaExecutable: string,
  forgeInstallerPath: string,
  fakeLauncher: string,
  installType: "Client" | "Server",
  logger: logger
) {
  const forgeInstallerArgs = [
    "-jar",
    forgeInstallerPath,
    `--install${installType}`,
    path.join(fakeLauncher),
  ]

  logger(
    "forge",
    `[nlk ${packageVersion}] Running forge installer : "${javaExecutable} ${forgeInstallerArgs.join(" ")}"`,
  );
  const forgeInstaller = spawn(javaExecutable, forgeInstallerArgs, { cwd: fakeLauncher });

  forgeInstaller.stdout.on("data", (data: Buffer) =>
    logger("forge", data.toString()),
  );

  forgeInstaller.stderr.on("data", (data: Buffer) =>
    logger("forge", data.toString()),
  );

  return new Promise<void>((res, rej) => {
    forgeInstaller.on("error", (err) => {
      rej(err);
    });
    forgeInstaller.on("close", () => {
      res();
    });
  });
}

function isModernForge(version: string) {
  if (version.startsWith("1.")) {
    version = version.slice(2, version.length)
  }

  const parsed = version.split(".").map(v => parseInt(v))

  if (parsed[0] > 12) {
    return true
  } else if (parsed[0] === 12 && parsed[1] === 2) {
    return true
  } else return false
}

export async function installForge(
  config: ModloaderConfig,
  logger: logger
) {
  const forgeLibDir = path.join(config.paths.root, "libraries", "net", "minecraftforge", "forge", `${config.version}-${config.modloader.version}`)
  const neoForgeLibDir = path.join(config.paths.root, "libraries", "net", "neoforged", "neoforge", `${config.modloader.version}`)

  // older forge jar path
  const universalDestination = path.join(forgeLibDir, `forge-${config.version}-${config.modloader.version}.jar`)
  // newer forge jar path
  const forgeClientDestination = path.join(forgeLibDir, `forge-${config.version}-${config.modloader.version}-client.jar`)
  // neoforge jar path
  const neoForgeClientDestination = path.join(neoForgeLibDir, `neoforge-${config.modloader.version}-client.jar`)

  if (await exists(universalDestination) || await exists(forgeClientDestination) || await exists(neoForgeClientDestination)) return;

  const tempFolder = await setupFakeLauncher();

  // Download and extract installer file
  const forgeInstallerPath = await downloadJar(
    config,
    "installer",
    tempFolder,
    logger
  );

  const fakeLauncher = path.join(tempFolder, "fakeLauncher");

  const modernInstaller = isModernForge(config.version)

  await runForgeInstaller(config.javaExecutable, forgeInstallerPath, fakeLauncher, modernInstaller ? "Client" : "Server", logger);

  // Copy libraries and versions files
  for (const file of await fs.readdir(path.join(fakeLauncher, "libraries"))) {
    await fs.cp(
      path.join(fakeLauncher, "libraries", file),
      path.join(config.paths.libraries, file),
      {
        recursive: true,
      },
    );
  }

  if (isModernForge(config.version)) {
    // Modern forge (version >= 1.12.2)
    const fakeLauncherProfiles = await readJson<LauncherProfiles>(
      path.join(fakeLauncher, "launcher_profiles.json"),
    );
    const originalVersionId =
      fakeLauncherProfiles.profiles[Object.keys(fakeLauncherProfiles.profiles)[0]]
        .lastVersionId;

    await fs.cp(
      path.join(fakeLauncher, "versions", originalVersionId),
      path.join(config.paths.versions, originalVersionId),
      { recursive: true },
    );
  } else {
    // Older versions (from 1.5.2 to 1.12.2, even older versions are not supported)
    const universalPath = path.join(fakeLauncher, `forge-${config.version}-${config.modloader.version}-universal.jar`)

    // Copy forge jar
    await ensureDir(path.join(config.paths.root, "libraries", "net", "minecraftforge", "forge", `${config.version}-${config.modloader.version}`), true)
    await fs.cp(
      universalPath,
      universalDestination,
      { recursive: true },
    );

    // Copy version json
    const zip = new AdmZip(universalPath)
    zip.extractEntryTo("version.json", path.join(config.paths.versions, `${config.version}-forge-${config.modloader.version}`))
    await fs.rename(path.join(config.paths.versions, `${config.version}-forge-${config.modloader.version}`, "version.json"), path.join(config.paths.versions, `${config.version}-forge-${config.modloader.version}`, `${config.version}-forge-${config.modloader.version}.json`))
  }
}

export function runFabricInstaller(
  config: ModloaderConfig,
  fabricInstallerPath: string,
  fakeLauncher: string,
  logger: logger) {

  const fabricInstallerArgs = [
    "-jar",
    fabricInstallerPath,
    "client",
    "-dir",
    path.join(fakeLauncher),
    "-mcversion",
    config.version,
    "-loader",
    config.modloader.version
  ]

  logger(
    "fabric",
    `[nlk ${packageVersion}] Running fabric installer : "${config.javaExecutable} ${fabricInstallerArgs.join(" ")}"`,
  );

  const fabricInstaller = spawn(config.javaExecutable, fabricInstallerArgs, { cwd: fakeLauncher });

  fabricInstaller.stdout.on("data", (data: Buffer) =>
    logger("fabric", data.toString()),
  );

  fabricInstaller.stderr.on("data", (data: Buffer) =>
    logger("fabric", data.toString()),
  );

  return new Promise<void>((res, rej) => {
    fabricInstaller.on("error", (err) => {
      rej(err);
    });
    fabricInstaller.on("close", () => {
      res();
    });
  });
}

export async function installFabric(config: ModloaderConfig, logger: logger) {
  /*
    Forced to reinstall fabric even if the same version is already installed
    as we at least need version json (and maybe libraries too).
    Note: fabric seems to make each of its update available to every minecraft version.
  */
  const tempFolder = await setupFakeLauncher()
  const fakeLauncher = path.join(tempFolder, "fakeLauncher")

  // Download installer file
  const fabricInstallerPath = await downloadJar(
    config,
    "installer",
    tempFolder,
    logger
  );

  await runFabricInstaller(config, fabricInstallerPath, fakeLauncher, logger)

  // Copy libraries and versions files
  for (const file of await fs.readdir(path.join(fakeLauncher, "libraries"))) {
    await fs.cp(
      path.join(fakeLauncher, "libraries", file),
      path.join(config.paths.libraries, file),
      {
        recursive: true,
      },
    );
  }

  const fakeLauncherProfiles = await readJson<LauncherProfiles>(
    path.join(fakeLauncher, "launcher_profiles.json"),
  );
  const originalVersionId =
    fakeLauncherProfiles.profiles[Object.keys(fakeLauncherProfiles.profiles)[0]]
      .lastVersionId;

  const versionId = `${config.version}-fabric-${config.modloader.version}`
  await ensureDir(path.join(config.paths.versions, versionId))
  console.log(path.join(config.paths.versions, originalVersionId, `${originalVersionId}.json`), path.join(config.paths.versions, versionId, `${versionId}.json`))
  await fs.cp(path.join(fakeLauncher, "versions", originalVersionId, `${originalVersionId}.json`), path.join(config.paths.versions, versionId, `${versionId}.json`))
}