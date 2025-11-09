import AdmZip from "adm-zip";
import { PoolFile } from "./types";
import { downloadFile, DownloadPool } from "./fetch";
import path from "path";
import { Options } from "p-queue";

export function unzipAll(from: string, to: string) {
  const zip = new AdmZip(from);
  zip.extractAllTo(to, true);
}

export class DownloadAndUnzipPool extends DownloadPool {
  destination: string;
  tempPath: string;

  constructor(
    elements: PoolFile[],
    destination: string,
    tempPath: string,
    options?: Options<null, null>,
  ) {
    super(elements, options);
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
    for (const element of this.elements) {
      this.totalSize += element.size;

      this.add(async () => {
        await this.downloadAndUnzip(element);
        // update status here to ensure that it is run before "completed" events listeners
        this.done++;
        this.doneSize += element.size;
      });
    }

    await this.onIdle();
  }
}
