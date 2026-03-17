import path from "path";
import { downloadFile } from "../utils/fetch";
import { getTempFolder } from "../utils/temp";
import { LauncherProfiles, Modloader, Version } from "../utils/types";
import fs from "fs/promises";
import { execSync, spawn } from "child_process";
import { version as packageVersion } from "../../package.json";
import { ensureDir, readJson } from "../utils/fs";
import { InstallError } from "../utils/errors";
import AdmZip from "adm-zip";

const versionWithDoubleName = ["1.9.4", "1.9.0", "1.8.9", "1.8.8", "1.8", "1.7.10"]
function fixVersionWithDoubleName(version: string, modloader: Modloader) {
  if (versionWithDoubleName.includes(version)) {
    // these versions have a different file name on forge's maven
    modloader.version = modloader.version + `-${version}`
  }
  return modloader
}

async function downloadJar(
  minecraftVersion: string,
  modloader: Modloader,
  type: "universal" | "installer",
  destination: string,
) {
  let filePath = "";
  modloader = fixVersionWithDoubleName(minecraftVersion, modloader)
  try {
    if (modloader.name === "forge") {
      if (type === "universal") {
        filePath = path.join(
          destination,
          `forge-${minecraftVersion}-${modloader.version}-universal.jar`,
        );
        await downloadFile({
          url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${modloader.version}/forge-${minecraftVersion}-${modloader.version}-universal.jar`,
          path: filePath,
        });
      } else {
        filePath = path.join(
          destination,
          `forge-${minecraftVersion}-${modloader.version}-installer.jar`,
        );
        await downloadFile({
          url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${minecraftVersion}-${modloader.version}/forge-${minecraftVersion}-${modloader.version}-installer.jar`,
          path: filePath,
        });
      }
    } else if (modloader.name === "neoforge") {
      filePath = path.join(
        destination,
        `neoforge-${modloader.version}-installer.jar`,
      );
      await downloadFile({
        url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${modloader.version}/neoforge-${modloader.version}-installer.jar`,
        path: filePath,
      });
    }
  } catch (original) {
    //@ts-expect-error no access to instance
    const error = new InstallError("modloader", null, original, "Check that the version of the modloader exists.");
    error.throw();
  }

  return filePath;
}

export function runForgeInstaller(
  javaExecutable: string,
  forgeInstallerPath: string,
  fakeLauncher: string,
  installType: "Client" | "Server"
) {
  console.log(execSync(`${javaExecutable} -version`).toString());
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

export async function installForge(
  versionManifest: Version,
  modloader: Modloader,
  javaExecutable: string,
  root: string,
  instanceLocation: string,
  librariesPath: string,
  versionsPath: string
) {
  const tempFolder = await getTempFolder("forge");
  // Download and extract installer file
  const forgeInstallerPath = await downloadJar(
    versionManifest.id,
    modloader,
    "installer",
    tempFolder,
  );

  const fakeLauncher = path.join(tempFolder, "fakeLauncher");

  await fs.mkdir(fakeLauncher);
  await fs.writeFile(path.join(fakeLauncher, "launcher_profiles.json"), `{"profiles":{}}`);

  const modernInstaller = isModernForge(versionManifest.id)

  await runForgeInstaller(javaExecutable, forgeInstallerPath, fakeLauncher, modernInstaller ? "Client" : "Server");

  // Copy libraries and versions files
  for (const file of await fs.readdir(path.join(fakeLauncher, "libraries"))) {
    await fs.cp(
      path.join(fakeLauncher, "libraries", file),
      path.join(librariesPath, file),
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
      path.join(versionsPath, originalVersionId),
      { recursive: true },
    );
  } else {
    // Older versions (from 1.5.2 to 1.12.2, even older versions are not supported)
    //await runForgeInstaller(javaExecutable, forgeInstallerPath, fakeLauncher, "Server");

    const universalPath = path.join(fakeLauncher, `forge-${versionManifest.id}-${modloader.version}-universal.jar`)

    // Copy forge jar
    await ensureDir(path.join(root, "libraries", "net", "minecraftforge", "forge", `${versionManifest.id}-${modloader.version}`), true)
    await fs.cp(
      universalPath,
      path.join(root, "libraries", "net", "minecraftforge", "forge", `${versionManifest.id}-${modloader.version}`, `forge-${versionManifest.id}-${modloader.version}.jar`),
      { recursive: true },
    );

    // Copy version json
    const zip = new AdmZip(universalPath)
    zip.extractEntryTo("version.json", path.join(versionsPath, `${versionManifest.id}-forge-${modloader.version}`))
    await fs.rename(path.join(versionsPath, `${versionManifest.id}-forge-${modloader.version}`, "version.json"), path.join(versionsPath, `${versionManifest.id}-forge-${modloader.version}`, `${versionManifest.id}-forge-${modloader.version}.json`))
  }
}
