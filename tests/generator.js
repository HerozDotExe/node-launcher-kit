import fs from "fs/promises"
import path from "path"
import { Browser, BrowserWindow } from 'happy-dom';
import PQueue from 'p-queue';

const importantVersions = ["1.7.10", "1.12.2", "1.16.5", "1.18.2", "1.20.1", "1.21.1", "1.21.11"]

const java8 = process.argv[2]
const java21 = process.argv[3]
const java = java8 && java21

const vanillaVersions = (
    await (await fetch(
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    )).json()).versions.filter(v => v.type === "release")


async function getJava(mcVersion) {
    const versionManifestUrl = vanillaVersions.find(v => {
        const parsedVersion = mcVersion.split(".")
        if (parsedVersion[2] === "0") {
            mcVersion = `${parsedVersion[0]}.${parsedVersion[1]}`
        }
        return v.id === mcVersion
    }).url

    const versionManifest = await (
        await (await fetch(
            versionManifestUrl,
        )).json()
    )

    return versionManifest.javaVersion ? (versionManifest.javaVersion.component === "jre-legacy" ? java8 : java21) : java8
}

async function fExists(path) {
    try {
        await fs.stat(path)
        return true
    } catch (error) {
        return false
    }
}

const tempFolder = import.meta.dirname

if (await fExists(path.join(tempFolder, "vanilla"))) { await fs.rm(path.join(tempFolder, "vanilla"), { recursive: true }) }
if (await fExists(path.join(tempFolder, "modloaders/forge"))) { await fs.rm(path.join(tempFolder, "modloaders/forge"), { recursive: true }) }
if (await fExists(path.join(tempFolder, "modloaders/neoforge"))) { await fs.rm(path.join(tempFolder, "modloaders/neoforge"), { recursive: true }) }

await fs.mkdir(path.join(tempFolder, "vanilla"))
await fs.mkdir(path.join(tempFolder, "modloaders/forge"))
await fs.mkdir(path.join(tempFolder, "modloaders/neoforge"))

// Forge
{
    const queue = new PQueue({ concurrency: 10 })
    const browser = new Browser()

    for (const version of importantVersions) {
        queue.add(async () => {
            const page = browser.newPage()
            await page.goto(`https://files.minecraftforge.net/net/minecraftforge/forge/index_${version}.html`)
            const document = page.mainFrame.document;
            const forgeVersion = document.querySelector("body > main > div.sidebar-sticky-wrapper-content > div.promos-wrapper > div.promos-content > div > div:nth-child(1) > div.title > small").innerText.split("- ")[1]

            if (!await fExists(path.join(tempFolder, `modloaders/forge/forge-${version}-${forgeVersion}.test.ts`))) {
                let result = ""
                if (java) {
                    const template = await fs.readFile(path.join(tempFolder, "forge-java.test.ts.template"), { encoding: "utf-8" })
                    result = template.replaceAll("${version}", version).replace("${modloader}", "forge").replace("${modloader_version}", forgeVersion).replace("${java}", await getJava(version))
                } else {
                    const template = await fs.readFile(path.join(tempFolder, "forge.test.ts.template"), { encoding: "utf-8" })
                    result = template.replaceAll("${version}", version).replace("${modloader}", "forge").replace("${modloader_version}", forgeVersion)
                }
                await fs.writeFile(path.join(tempFolder, `modloaders/forge/forge-${version}-${forgeVersion}.test.ts`), result)
                console.log(`Done forge ${forgeVersion}`)
            }
        })
    }
}

// Neoforge
{
    let versions = (await (await fetch("https://maven.neoforged.net/api/maven/versions/releases/net%2Fneoforged%2Fneoforge")).json()).versions.filter(v => !v.includes("beta") && !v.includes("craftmine") && importantVersions.includes(`1.${v.split(".")[0]}.${v.split(".")[1]}`))
    versions = Object.values(Object.groupBy(versions, (v) => {
        const parsedVersion = v.split(".")
        const start = `1.${parsedVersion[0]}.${parsedVersion[1]}`
        return start
    })).map(arr => arr[arr.length-1])

    for (const neoForgeVersion of versions) {
        const parsedVersion = neoForgeVersion.split(".")
        let mcVersion = `${parsedVersion[0]}.${parsedVersion[1]}`
        if (parseInt(parsedVersion[0]) < 26) {
            mcVersion = "1." + mcVersion
        }

        if (!await fExists(path.join(tempFolder, `modloaders/neoforge/neoforge-${mcVersion}-${neoForgeVersion}.test.ts`))) {
            let result = ""
            if (java) {
                const template = await fs.readFile(path.join(tempFolder, "forge-java.test.ts.template"), { encoding: "utf-8" })
                result = template.replaceAll("${version}", mcVersion).replace("${modloader}", "neoforge").replace("${modloader_version}", neoForgeVersion).replace("${java}", await getJava(mcVersion))
            } else {
                const template = await fs.readFile(path.join(tempFolder, "forge.test.ts.template"), { encoding: "utf-8" })
                result = template.replaceAll("${version}", mcVersion).replace("${modloader}", "neoforge").replace("${modloader_version}", neoForgeVersion)
            }
            await fs.writeFile(path.join(tempFolder, `modloaders/neoforge/neoforge-${mcVersion}-${neoForgeVersion}.test.ts`), result)
            console.log(`Done neoforge ${neoForgeVersion}`)
        }
    }
}

// Vanilla
{
    vanillaVersions.filter(v => importantVersions.includes(v.id)).forEach(async v => {
        if (!await fExists(path.join(tempFolder, `vanilla/vanilla-${v.id}.test.ts`))) {
            let result = ""
            if (java) {
                const template = await fs.readFile(path.join(tempFolder, "vanilla-java.test.ts.template"), { encoding: "utf-8" })
                result = template.replaceAll("${version}", v.id).replace("${java}", await getJava(v.id))
            } else {
                const template = await fs.readFile(path.join(tempFolder, "vanilla.test.ts.template"), { encoding: "utf-8" })
                result = template.replaceAll("${version}", v.id)
            }
            await fs.writeFile(path.join(tempFolder, `vanilla/vanilla-${v.id}.test.ts`), result)
            console.log(`Done vanilla ${v.id}`)
        }
    });
}