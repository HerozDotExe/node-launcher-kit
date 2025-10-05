import { tmpdir } from "os";
import path from "path";
import { ensureDir } from "./fs";
import fs from "fs/promises";

/**
 * Returns an empty temporary folder.
 * The folder gets wiped before every call.
 */
export async function getTempFolder(name: string) {
  const tempPath = path.join(tmpdir(), "nlk", name);
  await fs.rm(tempPath, { force: true, recursive: true });
  await ensureDir(tempPath, true);
  return tempPath;
}
