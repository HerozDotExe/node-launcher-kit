import { downloadFile, fetchJson } from "../utils/fetch";
import { exists, readJson } from "../utils/fs";
import { Versions, Version } from "../utils/types";
import path from "path";

export async function getVersionManifestUrl(versionString: string) {
  const versions = await (
    await fetchJson<Versions>(
      "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    )
  ).versions;

  let versionManifestURL = "";
  for (const v in versions) {
    if (Object.prototype.hasOwnProperty.call(versions, v)) {
      const version = versions[v];
      if (version.id === versionString) {
        versionManifestURL = version.url;
      }
    }
  }

  return versionManifestURL;
}

export async function downloadJson(versionString: string, to: string) {
  const destination = path.join(to, `${versionString}.json`);
  if (!(await exists(destination)))
    await downloadFile({
      url: await getVersionManifestUrl(versionString),
      path: destination,
    });
}

export async function downloadJar(versionManifest: Version, to: string) {
  const destination = path.join(to, `${versionManifest.id}.jar`);
  if (!(await exists(destination)))
    await downloadFile({
      url: versionManifest.downloads.client.url,
      path: destination,
    });
}

export async function getVersionManifest(versionString: string, to: string) {
  const destination = path.join(to, `${versionString}.json`);
  if (await exists(destination)) {
    return await readJson<Version>(destination);
  }

  await downloadJson(versionString, to);
  return await readJson<Version>(destination);
}
