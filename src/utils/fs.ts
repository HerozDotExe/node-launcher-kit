import fs from "fs/promises";

export async function exists(path: string) {
  try {
    await fs.access(path, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(path: string, recursive = false) {
  if (!(await exists(path))) {
    await fs.mkdir(path, { recursive });
    return true;
  } else return false;
}

export async function readJson<T>(destination: string): Promise<T> {
  return JSON.parse(await fs.readFile(destination, { encoding: "utf-8" }));
}
