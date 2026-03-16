import path from "path";
import { downloadFile } from "../utils/fetch";
import { Version } from "../utils/types";
import { exists } from "../utils/fs";
import { hash } from "crypto";
import fs from "fs/promises";

async function patchFileLog4j(xmlDestination: string) {
  const original = await fs.readFile(xmlDestination, { encoding: "utf-8" })
  await fs.writeFile(xmlDestination, original.replace("<LegacyXMLLayout />", "").replace("<XMLLayout />", ""))
}

export async function getArgument(
  versionManifest: Version,
  destination: string,
): Promise<string | null> {
  if (versionManifest.logging?.client) {
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

      await patchFileLog4j(xmlDestination)

      return versionManifest.logging.client.argument.replace(
        "${path}",
        xmlDestination,
      );
    }
  }
  
  // if logging is not present it means that the verson is older than 1.7 hence the fix for log4j isn't needed
  return null
}
