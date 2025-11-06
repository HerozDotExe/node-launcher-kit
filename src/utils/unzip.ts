import AdmZip from "adm-zip";
import { PoolFile } from "./types";
import { Task } from "./task";
import { downloadFile } from "./fetch";
import path from "path";

export function unzipAll(from: string, to: string) {
  const zip = new AdmZip(from);
  zip.extractAllTo(to, true);
}

export class DownloadAndUnzipPool extends Task<PoolFile> {
  files: PoolFile[];
  tempPath: string;
  destination: string;

  constructor(
    files: PoolFile[],
    concurrency: number,
    destination: string,
    tempPath: string,
  ) {
    super(concurrency);
    this.files = files;
    this.total = files.length;
    this.tempPath = tempPath;
    this.destination = destination;
  }

  async downloadAndUnzip(file: PoolFile) {
    const tempFile = path.join(this.tempPath, path.basename(file.path));
    await downloadFile({
      url: file.url,
      path: tempFile,
    });
    unzipAll(tempFile, this.destination);
  }

  async run() {
    await this._run(async (file: PoolFile) => {
      await this.downloadAndUnzip(file);
    }, this.files);
  }
}
