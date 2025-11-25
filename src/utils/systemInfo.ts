export function os() {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "osx";
    default:
      return "linux";
  }
}

export function arch() {
  switch(process.arch) {
    case "arm":
    case "arm64":
      return "arm"
    case "x64":
      return "x64"
    default:
      return "x86"
  }
}