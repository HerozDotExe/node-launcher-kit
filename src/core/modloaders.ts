import path from "path";
import { downloadFile } from "../utils/fetch";
import { getTempFolder } from "../utils/temp";
import { LauncherProfiles, Modloader, Version } from "../utils/types";
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

async function downloadJar(
  config: ModloaderConfig,
  type: "universal" | "installer",
  destination: string,
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
    }
  } catch (error) {
    throw new InstallError("An error occured while downloadng natives", "natives", config, { cause: error })
  }

  return filePath;
}

export function runForgeInstaller(
  javaExecutable: string,
  forgeInstallerPath: string,
  fakeLauncher: string,
  installType: "Client" | "Server"
) {
  console.log(
    `[nlk ${packageVersion}] Running forge installer : "${javaExecutable} -jar ${forgeInstallerPath} --install${installType} ${path.join(fakeLauncher)}"`,
  );
  const forgeInstaller = spawn(javaExecutable, [
    "-jar",
    forgeInstallerPath,
    `--install${installType}`,
    path.join(fakeLauncher),
  ], { cwd: fakeLauncher });

  forgeInstaller.stdout.on("data", (data: Buffer) =>
    console.log(data.toString()),
  );

  forgeInstaller.stderr.on("data", (data: Buffer) =>
    console.log(data.toString()),
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

export interface ModloaderConfig extends Config {
  modloader: Modloader
}

export async function installForge(
  config: ModloaderConfig,
  versionManifest: Version
) {
  const forgeLibDir = path.join(config.paths.root, "libraries", "net", "minecraftforge", "forge", `${versionManifest.id}-${config.modloader.version}`)
  const neoForgeLibDir = path.join(config.paths.root, "libraries", "net", "neoforged", "neoforge", `${config.modloader.version}`)

  // older forge jar path
  const universalDestination = path.join(forgeLibDir, `forge-${versionManifest.id}-${config.modloader.version}.jar`)
  // newer forge jar path
  const forgeClientDestination = path.join(forgeLibDir, `forge-${versionManifest.id}-${config.modloader.version}-client.jar`)
  // neoforge jar path
  const neoForgeClientDestination = path.join(neoForgeLibDir, `neoforge-${config.modloader.version}-client.jar`)

  if (await exists(universalDestination) || await exists(forgeClientDestination) || await exists(neoForgeClientDestination)) return;

  const tempFolder = await getTempFolder("forge");
  // Download and extract installer file
  const forgeInstallerPath = await downloadJar(
    config,
    "installer",
    tempFolder,
  );

  const fakeLauncher = path.join(tempFolder, "fakeLauncher");

  await fs.mkdir(fakeLauncher);
  await fs.writeFile(path.join(fakeLauncher, "launcher_profiles.json"), `{"profiles":{}}`);

  const modernInstaller = isModernForge(versionManifest.id)

  await runForgeInstaller(config.javaExecutable, forgeInstallerPath, fakeLauncher, modernInstaller ? "Client" : "Server");

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

  if (isModernForge(versionManifest.id)) {
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
    const universalPath = path.join(fakeLauncher, `forge-${versionManifest.id}-${config.modloader.version}-universal.jar`)

    // Copy forge jar
    await ensureDir(path.join(config.paths.root, "libraries", "net", "minecraftforge", "forge", `${versionManifest.id}-${config.modloader.version}`), true)
    await fs.cp(
      universalPath,
      universalDestination,
      { recursive: true },
    );

    // Copy version json
    const zip = new AdmZip(universalPath)
    zip.extractEntryTo("version.json", path.join(config.paths.versions, `${versionManifest.id}-forge-${config.modloader.version}`))
    await fs.rename(path.join(config.paths.versions, `${versionManifest.id}-forge-${config.modloader.version}`, "version.json"), path.join(config.paths.versions, `${versionManifest.id}-forge-${config.modloader.version}`, `${versionManifest.id}-forge-${config.modloader.version}.json`))
  }
}
