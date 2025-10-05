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
};

export type PoolFile = { url: string; path: string };

export type Versions = {
  latest: { release: string; snapshot: string };
  versions: {
    id: string;
    type: "snapshot" | "release" | "old_beta" | "old_alpha";
    url: string;
    time: string;
    releaseTime: string;
    sha1: string;
    complianceLevel: number;
  }[];
};

export type Native = {
  path: string;
  sha1: string;
  size: number;
  url: string;
};

type NativeOS = "natives-linux" | "natives-windows" | "natives-macos";

type JVMRule = {
  action: string;
  os: { name?: string; version?: string; arch?: string };
};

type LibraryRule = { action: string; os?: { name: string } };

export type Library = {
  downloads: {
    artifacts: {
      path: string;
      sha1: string;
      size: number;
      url: string;
    };
    classifiers?: {
      [key in NativeOS]: Native;
    };
  };
  name: string;
  rules?: LibraryRule[];
  natives?: { [key: string]: string };
};

export type Version = {
  arguments: {
    game: string[];
    jvm:
      | {
          rules: JVMRule[];
          value: string[] | string;
        }
      | string[];
  };
  assetIndex: {
    id: string;
    sha1: string;
    size: number;
    totalSize: number;
    url: string;
  };
  assets: string;
  complianceLevel: number;
  downloads: {
    client: File;
    client_mappings: File;
    server: File;
    server_mappings: File;
  };
  id: string;
  javaVersion: {
    component: RuntimeComponent;
    majorVersion: number;
  };
  libraries: Library[];
  logging: {
    client: {
      argument: string;
      file: { id: string; sha1: string; size: number; url: string };
      type: string;
    };
  };
};
