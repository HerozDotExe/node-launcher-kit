import AdmZip from "adm-zip";
import { PoolFile } from "./types";
import { downloadFile, DownloadPool } from "./fetch";
import path from "path";
import { Options } from "p-queue";

export function unzipAll(from: string, to: string, filters: string[]) {
  const zip = new AdmZip(from);

  for (const entry of zip.getEntries()) {
    let shouldSkip = false;
    for (const filter of filters) {
      if (entry.entryName.includes(filter)) {
        shouldSkip = true;
        console.log("skipping", entry.entryName)
      }
    }
    if (shouldSkip) continue;
    zip.extractEntryTo(entry.entryName, to);
  }
}

export class DownloadAndUnzipPool extends DownloadPool {
  destination: string;
  tempPath: string;
  filters: string[];

  constructor(
    elements: PoolFile[],
    destination: string,
    tempPath: string,
    options?: Options<null, null>,
    filters: string[] = [],
  ) {
    super(elements, options);
    this.tempPath = tempPath;
    this.destination = destination;
    this.filters = filters;
  }

  async downloadAndUnzip(file: PoolFile, filters: string[]) {
    const tempFile = path.join(this.tempPath, path.basename(file.path));
    await downloadFile({
      url: file.url,
      path: tempFile,
    });
    unzipAll(tempFile, this.destination, filters);
  }

  async run() {
    for (const element of this.elements) {
      this.totalSize += element.size;

      this.add(async () => {
        await this.downloadAndUnzip(element, this.filters);
        // update status here to ensure that it is run before "completed" events listeners
        this.done++;
        this.doneSize += element.size;
      });
    }

    await this.onIdle();
  }
}
