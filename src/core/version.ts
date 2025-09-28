import { fetchJson } from "../utils/fetch";
import { Versions, Version } from "../utils/types";

export async function getVersionManifest(versionString: string) {
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

  const versionManifest = await fetchJson<Version>(versionManifestURL);

  return versionManifest;
}
