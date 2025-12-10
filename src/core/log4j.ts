import path from "path";
import { downloadFile } from "../utils/fetch";
import { Version } from "../utils/types";
import { exists } from "../utils/fs";
import { hash } from "crypto";
import fs from "fs/promises";

async function patchFileLog4j(versionManifest: Version, xmlDestination: string) {
  const original = await fs.readFile(xmlDestination, {encoding: "utf-8"})
  await fs.writeFile(xmlDestination, original.replace("<LegacyXMLLayout />", ""))
}

export async function getArgument(
  versionManifest: Version,
  destination: string,
) {
  const xmlDestination = path.join(
    destination,
    versionManifest.logging.client.file.id,
  );
  if (!(await exists(xmlDestination))) {
    await downloadFile({
      url: versionManifest.logging.client.file.url,
      path: xmlDestination,
    });

    if (
      hash("sha1", await fs.readFile(xmlDestination, { encoding: "utf-8" })) !==
      versionManifest.logging.client.file.sha1
    ) {
      throw new Error("Wrong hash for log4j's xml config");
    }

    await patchFileLog4j(versionManifest, xmlDestination)
  }

  return versionManifest.logging.client.argument.replace(
    "${path}",
    xmlDestination,
  );
}
