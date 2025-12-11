import { version as packageVersion } from "../../package.json";
import { LaunchErrorInfos } from "./types";

export class InstallError extends Error {
  step: string;
  original: Error;
  constructor(step: string, original: Error) {
    super();
    this.step = step;
    this.original = original;
  }

  throw() {
    console.error(
      `[nlk ${packageVersion}] Error occured when installing ${this.step}: ${this.original.message}`,
    );
    console.error(`[nlk ${packageVersion}] Original error is:`, this.original);

    throw this;
  }
}

export class LaunchError extends Error {
  infos: LaunchErrorInfos;
  original: Error;
  constructor(
    infos: LaunchErrorInfos,
    original: Error,
  ) {
    super();
    this.infos = infos;
    this.original = original;
  }

  throw() {
    console.error(
      `[nlk ${packageVersion}] Error occured when launching the game: ${this.original.message}`,
    );
    console.error(`[nlk ${packageVersion}] Original error is:`, this.original);
    console.dir(this.infos);

    throw this;
  }
}
