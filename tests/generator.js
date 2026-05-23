import fs from "fs/promises";
import path from "path";
import { Browser, BrowserWindow } from "happy-dom";
import PQueue from "p-queue";

// Use "java" tests if you don't want tests to download java by themselves, you will need to provide binaries path :
// pnpm run test /path/to/java8/bin/java /path/to/java21/bin/java /path/to/java25/bin/java

const importantVersions = [
  "1.7.10",
  "1.12.2",
  "1.16.5",
  "1.18.2",
  "1.20.1",
  "1.21.1",
  "1.21.11",
  "26.1.2",
];
const modpacksUrls = [
  "https://cdn.modrinth.com/data/1KVo5zza/versions/FbnAVst2/Fabulously.Optimized-v12.0.7.mrpack",
  "https://cdn.modrinth.com/data/4BV47HRn/versions/krFPoaLH/Better%20MC%20%5BFORGE%5D%20BMC4%20v43.mrpack",
];

const java8 = process.argv[2];
const java21 = process.argv[3];
const java25 = process.argv[4];
const java = java8 && java21 && java25;

const vanillaVersions = (
  await (
    await fetch(
      "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    )
  ).json()
).versions.filter((v) => v.type === "release");

async function getJava(mcVersion) {
  const versionManifestUrl = vanillaVersions.find((v) => {
    const parsedVersion = mcVersion.split(".");
    if (parsedVersion[2] === "0") {
      mcVersion = `${parsedVersion[0]}.${parsedVersion[1]}`;
    }
    return v.id === mcVersion;
  }).url;

  const versionManifest = await await (await fetch(versionManifestUrl)).json();

  switch (versionManifest.javaVersion.component) {
    case "jre-legacy":
      return java8;
    case "java-runtime-epsilon":
      return java25;
    default:
      return java21;
  }
}

async function fExists(path) {
  try {
    await fs.stat(path);
    return true;
  } catch (error) {
    return false;
  }
}

const tempFolder = import.meta.dirname;

if (await fExists(path.join(tempFolder, "vanilla"))) {
  await fs.rm(path.join(tempFolder, "vanilla"), { recursive: true });
}
if (await fExists(path.join(tempFolder, "modrinth"))) {
  await fs.rm(path.join(tempFolder, "modrinth"), { recursive: true });
}
if (await fExists(path.join(tempFolder, "modloaders/forge"))) {
  await fs.rm(path.join(tempFolder, "modloaders/forge"), { recursive: true });
}
if (await fExists(path.join(tempFolder, "modloaders/neoforge"))) {
  await fs.rm(path.join(tempFolder, "modloaders/neoforge"), {
    recursive: true,
  });
}
if (await fExists(path.join(tempFolder, "modloaders/fabric"))) {
  await fs.rm(path.join(tempFolder, "modloaders/fabric"), { recursive: true });
}

await fs.mkdir(path.join(tempFolder, "vanilla"), { recursive: true });
await fs.mkdir(path.join(tempFolder, "modrinth"), { recursive: true });
await fs.mkdir(path.join(tempFolder, "modloaders/forge"), { recursive: true });
await fs.mkdir(path.join(tempFolder, "modloaders/neoforge"), {
  recursive: true,
});
await fs.mkdir(path.join(tempFolder, "modloaders/fabric"), { recursive: true });

// Forge
{
  const queue = new PQueue({ concurrency: 10 });
  const browser = new Browser();

  for (const version of importantVersions) {
    queue.add(async () => {
      const page = browser.newPage();
      await page.goto(
        `https://files.minecraftforge.net/net/minecraftforge/forge/index_${version}.html`,
      );
      const document = page.mainFrame.document;
      const forgeVersion = document
        .querySelector(
          "body > main > div.sidebar-sticky-wrapper-content > div.promos-wrapper > div.promos-content > div > div:nth-child(1) > div.title > small",
        )
        .innerText.split("- ")[1];

      if (
        !(await fExists(
          path.join(
            tempFolder,
            `modloaders/forge/forge-${version}-${forgeVersion}.test.ts`,
          ),
        ))
      ) {
        let result = "";
        if (java) {
          const template = await fs.readFile(
            path.join(tempFolder, "modloader-java.test.ts.template"),
            { encoding: "utf-8" },
          );
          result = template
            .replaceAll("${version}", version)
            .replaceAll("${modloader}", "forge")
            .replaceAll("${modloader_version}", forgeVersion)
            .replaceAll("${java}", await getJava(version));
        } else {
          const template = await fs.readFile(
            path.join(tempFolder, "modloader.test.ts.template"),
            { encoding: "utf-8" },
          );
          result = template
            .replaceAll("${version}", version)
            .replaceAll("${modloader}", "forge")
            .replaceAll("${modloader_version}", forgeVersion);
        }
        await fs.writeFile(
          path.join(
            tempFolder,
            `modloaders/forge/forge-${version}-${forgeVersion}.test.ts`,
          ),
          result,
        );
        console.log(`Done forge ${forgeVersion}`);
      }
    });
  }
}

// Neoforge
{
  let versions = (
    await (
      await fetch(
        "https://maven.neoforged.net/api/maven/versions/releases/net%2Fneoforged%2Fneoforge",
      )
    ).json()
  ).versions.filter(
    (v) =>
      !v.includes("beta") &&
      !v.includes("craftmine") &&
      importantVersions.includes(`1.${v.split(".")[0]}.${v.split(".")[1]}`),
  );
  versions = Object.values(
    Object.groupBy(versions, (v) => {
      const parsedVersion = v.split(".");
      const start = `1.${parsedVersion[0]}.${parsedVersion[1]}`;
      return start;
    }),
  ).map((arr) => arr[arr.length - 1]);

  for (const neoForgeVersion of versions) {
    const parsedVersion = neoForgeVersion.split(".");
    let mcVersion = `${parsedVersion[0]}.${parsedVersion[1]}`;
    if (parseInt(parsedVersion[0]) < 26) {
      mcVersion = "1." + mcVersion;
    }

    if (
      !(await fExists(
        path.join(
          tempFolder,
          `modloaders/neoforge/neoforge-${mcVersion}-${neoForgeVersion}.test.ts`,
        ),
      ))
    ) {
      let result = "";
      if (java) {
        const template = await fs.readFile(
          path.join(tempFolder, "modloader-java.test.ts.template"),
          { encoding: "utf-8" },
        );
        result = template
          .replaceAll("${version}", mcVersion)
          .replaceAll("${modloader}", "neoforge")
          .replaceAll("${modloader_version}", neoForgeVersion)
          .replaceAll("${java}", await getJava(mcVersion));
      } else {
        const template = await fs.readFile(
          path.join(tempFolder, "modloader.test.ts.template"),
          { encoding: "utf-8" },
        );
        result = template
          .replaceAll("${version}", mcVersion)
          .replaceAll("${modloader}", "neoforge")
          .replaceAll("${modloader_version}", neoForgeVersion);
      }
      await fs.writeFile(
        path.join(
          tempFolder,
          `modloaders/neoforge/neoforge-${mcVersion}-${neoForgeVersion}.test.ts`,
        ),
        result,
      );
      console.log(`Done neoforge ${neoForgeVersion}`);
    }
  }
}

// Fabric
{
  let mcVersions = (
    await (await fetch("https://meta.fabricmc.net/v2/versions/game")).json()
  )
    .filter((v) => {
      return importantVersions.includes(v.version);
    })
    .map((v) => v.version);

  for (const mcVersion of mcVersions) {
    const loaderVersions = await (
      await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`)
    ).json();
    const fabricVersion = loaderVersions.find((v) => v.loader.stable);
    if (fabricVersion) {
      if (
        !(await fExists(
          path.join(
            tempFolder,
            `modloaders/fabric/fabric-${mcVersion}-${fabricVersion.loader.version}.test.ts`,
          ),
        ))
      ) {
        let result = "";
        if (java) {
          const template = await fs.readFile(
            path.join(tempFolder, "modloader-java.test.ts.template"),
            { encoding: "utf-8" },
          );
          result = template
            .replaceAll("${version}", mcVersion)
            .replaceAll("${modloader}", "fabric")
            .replaceAll("${modloader_version}", fabricVersion.loader.version)
            .replaceAll("${java}", await getJava(mcVersion));
        } else {
          const template = await fs.readFile(
            path.join(tempFolder, "modloader.test.ts.template"),
            { encoding: "utf-8" },
          );
          result = template
            .replaceAll("${version}", mcVersion)
            .replaceAll("${modloader}", "fabric")
            .replaceAll("${modloader_version}", fabricVersion.loader.version);
        }
        await fs.writeFile(
          path.join(
            tempFolder,
            `modloaders/fabric/fabric-${mcVersion}-${fabricVersion.loader.version}.test.ts`,
          ),
          result,
        );
        console.log(`Done fabric ${mcVersion}`);
      }
    }
  }
}

// Vanilla
{
  vanillaVersions
    .filter((v) => importantVersions.includes(v.id))
    .forEach(async (v) => {
      if (
        !(await fExists(
          path.join(tempFolder, `vanilla/vanilla-${v.id}.test.ts`),
        ))
      ) {
        let result = "";
        if (java) {
          const template = await fs.readFile(
            path.join(tempFolder, "vanilla-java.test.ts.template"),
            { encoding: "utf-8" },
          );
          result = template
            .replaceAll("${version}", v.id)
            .replaceAll("${java}", await getJava(v.id));
        } else {
          const template = await fs.readFile(
            path.join(tempFolder, "vanilla.test.ts.template"),
            { encoding: "utf-8" },
          );
          result = template.replaceAll("${version}", v.id);
        }
        await fs.writeFile(
          path.join(tempFolder, `vanilla/vanilla-${v.id}.test.ts`),
          result,
        );
        console.log(`Done vanilla ${v.id}`);
      }
    });
}

// Modrinth modpacks
{
  modpacksUrls.forEach(async (url) => {
    const modpackId = url.split("/").pop().replace(".mrpack", "");
    let result = "";
    if (java) {
      const template = await fs.readFile(
        path.join(tempFolder, "modrinth-java.test.ts.template"),
        { encoding: "utf-8" },
      );
      // TODO: use java version based on modpack's minecraft version
      result = template
        .replaceAll("${modpack_url}", url)
        .replaceAll("${modpack_id}", modpackId)
        .replaceAll("${java}", java21);
    } else {
      const template = await fs.readFile(
        path.join(tempFolder, "modrinth.test.ts.template"),
        { encoding: "utf-8" },
      );
      // Same but inside tests
      result = template
        .replaceAll("${modpack_url}", url)
        .replaceAll("${modpack_id}", modpackId);
    }
    await fs.writeFile(
      path.join(tempFolder, `modrinth/modrinth-${modpackId}.test.ts`),
      result,
    );
    console.log(`Done modrinth ${modpackId}`);
  });
}
