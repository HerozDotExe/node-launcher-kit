import { Version } from "../utils/types";

export function mergeManifests(base: Version, layer: Version) {
  // Copy needed properties to base
  // Those properties should be enough for forge at least
  const result = { ...base }
  result.libraries = [];
  result.mainClass = layer.mainClass;

  // const librariesNames = base.libraries.map(
  //   (lib) => {
  //     return lib.name
  //   },
  // );

  // for (const lib of layer.libraries) {
  //   // remove duplicates
  //   if (!librariesNames.includes(lib.name)) {
  //     base.libraries.push(lib);
  //   }
  // }

  for (const bLib of base.libraries) {
    let isInLayer = false
    for (const lLib of layer.libraries) {
      const lId = lLib.name.split(":")[1]
      const bId = bLib.name.split(":")[1]

      if (lId === bId) {
        isInLayer = true
        break
      }
    }

    if (!isInLayer) {
      result.libraries.push(bLib)
    }
  }

  for (const lLib of layer.libraries) {
    result.libraries.push(lLib)
  }

  // modern versions
  if (layer.arguments && result.arguments) {
    if (layer.arguments.game) {
      for (const arg of layer.arguments.game) {
        result.arguments.game.push(arg);
      }
    }

    if (layer.arguments.jvm) {
      for (const arg of layer.arguments.jvm) {
        result.arguments.jvm.push(arg);
      }
    }
  } else {
    // older versions
    result.minecraftArguments = layer.minecraftArguments
  }

  return result;
}
