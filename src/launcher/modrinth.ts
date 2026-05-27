import path from "node:path";
import { downloadFile } from "../utils/fetch";
import { getTempFolder } from "../utils/temp";
import { unzipAll } from "../utils/unzip";
import { ensureDir, exists, readJson } from "../utils/fs";
import { Modloader, ModrinthManifest, BaseConfig, PoolFile, ModrinthPack } from "../utils/types";

function getModloader(manifest: ModrinthManifest): Modloader {
    if (manifest.dependencies["fabric-loader"]) {
        return { name: "fabric", version: manifest.dependencies["fabric-loader"] }
    } else if (manifest.dependencies["forge"]) {
        return { name: "forge", version: manifest.dependencies["forge"] }
    } else if (manifest.dependencies["neoforge"]) {
        return { name: "neoforge", version: manifest.dependencies["neoforge"] }
    } else {
        throw new Error("Unknown modloader")
    }
}

export async function importModrinthModpack(source: string, sourceType: "url" | "file"): Promise<ModrinthPack> {
    const tempFolder = await getTempFolder("modrinth")

    if (sourceType === "url") {
        const outputFile = path.join(tempFolder, "pack.mrpack")
        await downloadFile({ path: outputFile, url: source })
        source = outputFile
    }

    if (!await exists(source)) {
        throw new Error("Couldn't find modpack file")
    }

    await ensureDir(path.join(tempFolder, "pack"))

    await unzipAll(source, path.join(tempFolder, "pack"), [], "overwrite")

    const manifest = await readJson<ModrinthManifest>(path.join(tempFolder, "pack", "modrinth.index.json"))

    return {
        version: manifest.dependencies.minecraft,
        modloader: getModloader(manifest),
        files: manifest.files.map<PoolFile>(f => {
            return { url: f.downloads[0], path: f.path, size: f.fileSize }
        }),
        overridesPath: path.join(tempFolder, "pack", "overrides")
    }
}