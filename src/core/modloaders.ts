import path from "path";
import { downloadFile } from "../utils/fetch";
import { getTempFolder } from "../utils/temp";
import { LauncherProfiles, Modloader, Version } from "../utils/types";
import fs from "fs/promises";
import { execSync, spawn } from "child_process";
import { version as packageVersion } from "../../package.json";
import { readJson } from "../utils/fs";
import { InstallError } from "../utils/errors";

async function downloadJar(
  minecraftVersion: string,
  modloader: Modloader,
  type: "universal" | "installer",
  destination: string,
) {
  let filePath = "";
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
        `neoforge-${modloader.version}5-installer.jar`,
      );
      await downloadFile({
        url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${modloader.version}/neoforge-${modloader.version}-installer.jar`,
        path: filePath,
      });
    }
  } catch (original) {
    const error = new InstallError("modloader", original, "Check that the version of the modloader exists.");
    error.throw();
  }

  return filePath;
}

export function runForgeInstaller(
  javaExecutable: string,
  forgeInstallerPath: string,
  fakeLauncher: string,
) {
  console.log(execSync(`${javaExecutable} -version`).toString());
  console.log(
    `[nlk ${packageVersion}] Running forge installer : "${javaExecutable} -jar ${forgeInstallerPath} --installClient ${path.join(fakeLauncher)}"`,
  );
  const forgeInstaller = spawn(javaExecutable, [
    "-jar",
    forgeInstallerPath,
    "--installClient",
    path.join(fakeLauncher),
  ]);

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

  if (isModernForge(versionManifest.id)) {
    // Download and extract installer file
    const forgeInstallerPath = await downloadJar(
      versionManifest.id,
      modloader,
      "installer",
      tempFolder,
    );

    const fakeLauncher = path.join(tempFolder, "fakeLauncher");

    await fs.mkdir(fakeLauncher);
    await fs.writeFile(path.join(fakeLauncher, "launcher_profiles.json"), "{}");

    await runForgeInstaller(javaExecutable, forgeInstallerPath, fakeLauncher);

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
  }
}
