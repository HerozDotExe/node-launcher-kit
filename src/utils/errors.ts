import { version as packageVersion } from "../../package.json";
import { LaunchErrorInfos } from "./types";

export class InstallError extends Error {
  step: string;
  original: Error;
  moreInfo?: string;
  constructor(step: string, original: unknown, moreInfo?: string) {
    super();
    this.step = step;
    this.original = original as Error;
    this.moreInfo = moreInfo;
  }

  throw() {
    console.error(
      `[nlk ${packageVersion}] Error occured when installing ${this.step}: ${this.original.message}`,
    );
    console.error(`[nlk ${packageVersion}] Original error is:`, this.original);

    if (this.moreInfo) {
      console.error(this.moreInfo);
    }

    throw this;
  }
}

export class LaunchError extends Error {
  infos: LaunchErrorInfos;
  original: Error;
  constructor(infos: LaunchErrorInfos, original: Error) {
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
