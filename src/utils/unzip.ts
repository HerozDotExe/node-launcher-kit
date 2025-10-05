import AdmZip from "adm-zip";

export function unzipAll(from: string, to: string) {
  const zip = new AdmZip(from);
  zip.extractAllTo(to, true);
}
