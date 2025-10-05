import { os } from "./systemInfo";
import { Version } from "./types";

// Copied from https://github.com/Pierce01/MinecraftLauncher-core/blob/f4ce947658e82218011d92c36d4d8a1b8c0c2429/components/handler.js#L237
export function parseRule(library: Version["libraries"][number]): boolean {
  if (library.rules) {
    if (library.rules.length > 1) {
      if (
        library.rules[0].action === "allow" &&
        library.rules[1].action === "disallow" &&
        library.rules[1].os.name === "osx"
      ) {
        return os() === "osx";
      }
      return true;
    } else {
      if (library.rules[0].action === "allow" && library.rules[0].os)
        return library.rules[0].os.name !== os();
    }
  } else {
    return false;
  }
}
