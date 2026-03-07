import { Version } from "../utils/types";

export function mergeManifests(base: Version, layer: Version) {
  // Copy needed properties to base
  // Those properties should be enough for forge at least
  base.mainClass = layer.mainClass;

  const librariesHashes = base.libraries.filter(lib => lib.downloads.artifact).map(
    (lib) => {
      return lib.downloads.artifact.sha1
    },
  );

  for (const lib of layer.libraries) {
    if (!librariesHashes.includes(lib.downloads.artifact.sha1)) // remove duplicates
      base.libraries.push(lib);
  }

  // modern versions
  if (layer.arguments && base.arguments) {
    if (layer.arguments.game) {
      for (const arg of layer.arguments.game) {
        base.arguments.game.push(arg);
      }
    }

    if (layer.arguments.jvm) {
      for (const arg of layer.arguments.jvm) {
        base.arguments.jvm.push(arg);
      }
    }
  } else {
    // older versions
    base.minecraftArguments = layer.minecraftArguments
  }

  return base;
}
