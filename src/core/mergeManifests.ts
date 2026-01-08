import { Version } from "../utils/types";

export function mergeManifests(base: Version, layer: Version) {
  // Copy needed properties to base
  // Those properties should be enough for forge at least
  base.mainClass = layer.mainClass;

  const librariesHashes = base.libraries.map(
    (lib) => lib.downloads.artifact.sha1,
  );

  for (const lib of layer.libraries) {
    if (!librariesHashes.includes(lib.downloads.artifact.sha1)) // remove duplicates
      base.libraries.push(lib);
  }

  for (const arg of layer.arguments.game) {
    base.arguments.game.push(arg);
  }

  for (const arg of layer.arguments.jvm) {
    base.arguments.jvm.push(arg);
  }

  return base;
}
