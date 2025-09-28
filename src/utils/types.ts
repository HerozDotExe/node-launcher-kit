export type RuntimeComponent =
  | "java-runtime-alpha"
  | "java-runtime-beta"
  | "java-runtime-delta"
  | "java-runtime-gamma"
  | "java-runtime-gamma-snapsht"
  | "jre-legacy"
  | "minecraft-java-exe";

export type RuntimeOS =
  | "gamecore"
  | "linux"
  | "linux-i386"
  | "mac-os"
  | "mac-os-arm64"
  | "windows-arm64"
  | "windows-x64"
  | "windows-x86";

type File = {
  sha1: string;
  size: number;
  url: string;
};

type PerOSRuntimes = {
  [key in RuntimeComponent]: [
    {
      availability: {
        group: number;
        progress: number;
      };
      manifest: File;
      version: {
        name: string;
        released: string;
      };
    },
  ];
};

export type JavaRuntimesManifests = {
  [key in RuntimeOS]: PerOSRuntimes;
};

type FileType = "file" | "directory" | "link";

export type FilesList = {
  files: {
    [key: string]: {
      target?: string;
      downloads?: {
        lzma: File;
        raw: File;
      };
      executable?: boolean;
      type: FileType;
    };
  };
}

export type PoolFile = { url: string; path: string };