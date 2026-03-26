import { type Options as PQueueOptions } from "p-queue";

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

export type PoolFile = { url: string; path: string; size?: number };

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

type NativeOS = "natives-linux" | "natives-windows" | "natives-macos" | "natives-osx";

type Rules = {
  action: "allow" | "disallow";
  os?: { name?: string; version?: string; arch?: string };
  features?: { [key: string]: boolean };
};

export type Argument =
  | {
    rules: Rules[];
    value: string[] | string;
  }
  | string;

export type Library = {
  downloads?: {
    artifact: {
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
  rules?: Rules[];
  natives?: { [key: string]: string };
};

export type Version = {
  arguments?: {
    game: Argument[];
    jvm: Argument[];
  };
  minecraftArguments?: string;
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
  logging?: {
    client: {
      argument: string;
      file: { id: string; sha1: string; size: number; url: string };
      type: string;
    };
  };
  mainClass: string;
  minimumLauncherVersion: number;
  releaseTime: string;
  time: string;
  type: string;
  inheritsFrom: string;
};

export type AssetIndex = {
  objects: {
    [key: string]: {
      hash: string;
      size: number;
    };
  };
};

export type Auth = {
  access_token: string;
  client_token: string;
  uuid: string;
  name: string;
  user_properties: string;
  meta?: {
    type: "mojang" | "msa";
    demo: boolean;
    xuid: string;
    clientId: string;
  };
};

export type LaunchArguments = { command: string; args: string[] };

export type Paths = {
  root: string;
  instance: string;
  versions?: string;
  assets?: string;
  libraries?: string;
};

export type LaunchErrorConfig = {
  version: string;
  paths: Paths;
  auth: Auth;
  customGameArgs: string;
  customJvmArgs: string;
  versionManifest: Version;
  modloader: Modloader;
};

export type SupportedModloaders = "forge" | "neoforge" | "fabric";

export type Modloader = { name: SupportedModloaders; version: string };

export type LauncherProfiles = {
  profiles: {
    [key: string]: {
      name: string;
      type: string;
      lastVersionId: string;
      icon: string;
    };
  };
};

export type PoolOptions = {
  //@ts-expect-error can't figure out what to put as arguments of PQueueOptions
  pQueueOptions: PQueueOptions<null, null>;
  cleanup?: () => Promise<void>;
  overwrite?: boolean;
};

export interface InstanceEvents {
  progress: [
    type: string,
    done: number,
    total: number,
    doneSize: number,
    totalSize: number,
  ],
  log: [
    step: string,
    message: unknown
  ]
}

export type ProcessArgs = {
  game?: string,
  java?: string
}

export type ProcessRam = {
  max?: string,
  min?: string
}

export type logger = (step: string, message: unknown) => void

export type FabricInstallerMeta = {
  url: string,
  maven: string,
  version: string,
  stable: boolean
}[]