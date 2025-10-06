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
    case "ia32":
      return "x86"
    case "arm64":
    case "x64":
    default:
      return "x64"
  }
}