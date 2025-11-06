import fs from "fs";
import { pipeline } from "stream/promises";
import { PoolFile } from "./types";
import { Task } from "./task";
import { ensureDir } from "./fs";
import path from "path";

export async function fetchJson<T>(url: string): Promise<T> {
  return await (await fetch(url)).json();
}

export async function downloadFile(file: PoolFile) {
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

// export class DownloadPool {
//   files: PoolFiles;
//   concurrency: number;
//   controller: AbortController;
//   queue?: pQueue;

//   done: number;
//   total: number;
//   progressCallback: (done: number, total: number) => void;

//   constructor(
//     files: PoolFiles,
//     concurrentDownloads = 5,
//   ) {
//     this.files = files;
//     this.concurrency = concurrentDownloads;
//     this.controller = new AbortController();
//     this.queue = new pQueue({ concurrency: this.concurrency });
//     this.done = 0;
//     this.total = files.length;
//   }

//   async run() {
//     try {
//       for (const file of this.files) {
//         this.queue.add(async () => {
//           await downloadFile(file, this.controller.signal);
//         });
//       }
//     } catch (error) {
//       if (error.name !== "AbortError") throw error;
//       return;
//     }

//     this.queue.on("completed", () => {
//       this.done++;
//       this.progressCallback(this.done, this.total);
//     });

//     await this.queue.onIdle();
//   }

//   cancel() {
//     this.queue.clear();
//     this.controller.abort();
//   }
// }

export class DownloadPool extends Task<PoolFile> {
  files: PoolFile[];

  constructor(files: PoolFile[], concurrency: number) {
    super(concurrency);
    this.files = files;
    this.total = files.length;
  }

  async run() {
    await this._run(downloadFile, this.files);
  }
}

// export class AssetsDownloader extends DownloadPool {
//   assets: PoolFile[];
//   constructor(assets: PoolFile[], concurrency: number) {
//     super(assets, concurrency);
//     this.assets = assets;
//   }

//   async run() {
//     await this._run(downloadAssets, this.assets);
//   }
// }
