import AdmZip from "adm-zip";
import { PoolFile, PoolOptions } from "./types";
import { downloadFile, DownloadPool } from "./fetch";
import path from "path";
import { exists } from "./fs";

export async function unzipAll(from: string, to: string, filters: string[], mode: "overwrite" | "skip") {
  const zip = new AdmZip(from);

  for (const entry of zip.getEntries()) {
    let shouldSkip = false;
    for (const filter of filters) {
      if (entry.entryName.includes(filter)) {
        shouldSkip = true;
      }
    }
    if (shouldSkip) continue;
    if (!await exists(path.join(to, entry.entryName)) || mode === "overwrite") {
      zip.extractEntryTo(entry.entryName, to);
    }
  }
}

export class DownloadAndUnzipPool extends DownloadPool {
  destination: string;
  tempPath: string;
  filters: string[];
  unzipMode: "overwrite" | "skip"

  constructor(
    elements: PoolFile[],
    destination: string,
    tempPath: string,
    filters: string[] = [],
    unzipMode: "overwrite" | "skip",
    options: PoolOptions = { pQueueOptions: {}, overwrite: true },
  ) {
    super(elements, options);
    this.tempPath = tempPath;
    this.destination = destination;
    this.filters = filters;
    this.unzipMode = unzipMode
  }

  async downloadAndUnzip(file: PoolFile, filters: string[], unzipMode: "overwrite" | "skip") {
    const tempFile = path.join(this.tempPath, path.basename(file.path));
    await downloadFile({
      url: file.url,
      path: tempFile,
    });
    unzipAll(tempFile, this.destination, filters, unzipMode);
  }

  async run() {
    for (const element of this.elements) {
      this.totalSize += element.size!;

      this.add(async () => {
        await this.downloadAndUnzip(element, this.filters, this.unzipMode);
        // update status here to ensure that it is run before "completed" events listeners
        this.done++;
        this.doneSize += element.size!;
      });
    }

    await this.onIdle();
  }
}
