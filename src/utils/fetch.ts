import fs from "fs";
import { pipeline } from "stream/promises";
import { PoolFile, PoolOptions } from "./types";
import { ensureDir, exists } from "./fs";
import path from "path";
import PQueue from "p-queue";

export async function fetchJson<T>(url: string): Promise<T> {
  return await (await fetch(url)).json();
}

export async function downloadFile(file: PoolFile, overwrite = true) {
  if (overwrite || !(await exists(file.path))) {
    try {
      await ensureDir(path.dirname(file.path), true);
      const res = await fetch(file.url);

      if (!res.ok)
        throw new Error(
          `Failed to download ${file.url}: ${res.status} ${res.statusText}`,
        );
      await pipeline(res.body, fs.createWriteStream(file.path));
    } catch (error) {
      if (error.name !== "AbortError") throw error;
      return;
    }
  }
}

export class DownloadPool extends PQueue {
  done = 0;
  total = 0;
  doneSize = 0;
  totalSize = 0;
  elements: PoolFile[];
  cleanup: () => Promise<void>;
  overwrite: boolean;

  constructor(
    elements: PoolFile[],
    options: PoolOptions = { pQueueOptions: {}, overwrite: true },
  ) {
    super(options.pQueueOptions);
    this.elements = elements;
    this.total = this.elements.length;
    this.cleanup = options.cleanup;
    this.overwrite = options.overwrite;
  }

  async run() {
    for (const element of this.elements) {
      this.totalSize += element.size;

      this.add(async () => {
        await downloadFile(element, this.overwrite);
        // update status here to ensure that it is run before "completed" events listeners
        this.done++;
        this.doneSize += element.size;
      });
    }

    await this.onIdle();
    if (this.cleanup) {
      await this.cleanup();
    }
  }
}
