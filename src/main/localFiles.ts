import { dialog, shell } from "electron";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { profilesRoot } from "./profiles";
import { getSettings } from "./settings";
import { log } from "./logger";
import { bump } from "./stats";
import type { LocalFile } from "../shared/types";

const EXTENSIONS = new Set([".hmod", ".hnmod", ".hpack", ".hshader", ".zip"]);
const MOD_EXTENSIONS = new Set([".hmod", ".hnmod"]);

function kindFor(ext: string): LocalFile["kind"] {
  switch (ext) {
    case ".hmod":
      return "mod";
    case ".hnmod":
      return "native-mod";
    case ".hpack":
      return "pack";
    case ".hshader":
      return "shader";
    case ".zip":
      return "archive";
    default:
      return "other";
  }
}

function modsDir(profileId: string): string {
  return join(profilesRoot(), profileId, "mods");
}

async function hashFile(path: string): Promise<string | null> {
  try {
    const buffer = await readFile(path);
    return createHash("sha256").update(buffer).digest("hex");
  } catch {
    return null;
  }
}

async function describe(folder: string, name: string): Promise<LocalFile | null> {
  const full = join(folder, name);
  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    const enabled = !name.endsWith(".disabled");
    const effective = enabled ? name : name.slice(0, -".disabled".length);
    const ext = extname(effective).toLowerCase();
    return {
      name,
      ext,
      kind: kindFor(ext),
      enabled,
      size: info.size,
      modified: info.mtime.toISOString(),
      sha256: await hashFile(full),
    };
  } catch {
    return null;
  }
}

export async function listLocal(profileId: string): Promise<LocalFile[]> {
  const folder = modsDir(profileId);
  if (!existsSync(folder)) return [];
  const names = await readdir(folder);
  const files = await Promise.all(names.map((name) => describe(folder, name)));
  return files
    .filter((file): file is LocalFile => file !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function importOne(profileId: string, source: string): Promise<string> {
  const ext = extname(source).toLowerCase();
  if (!EXTENSIONS.has(ext)) throw new Error("E_TYPE");
  const info = await stat(source);
  const limit = getSettings().importLimitMb * 1024 * 1024;
  if (info.size > limit) throw new Error("E_TOO_LARGE");

  const target = modsDir(profileId);
  await mkdir(target, { recursive: true });
  const name = basename(source);
  let destination = join(target, name);
  if (existsSync(destination)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const base = name.slice(0, name.length - ext.length);
    destination = join(target, `${base}-${stamp}${ext}`);
  }
  await copyFile(source, destination);
  log("info", "library", `imported ${basename(destination)} into ${profileId}`);
  return basename(destination);
}

export async function importFiles(profileId: string, paths: string[]): Promise<string[]> {
  const imported: string[] = [];
  for (const path of paths) imported.push(await importOne(profileId, path));
  if (imported.length > 0) await bump("imports", imported.length);
  return imported;
}

export async function pickAndImport(profileId: string): Promise<string[]> {
  const result = await dialog.showOpenDialog({
    title: "Import mods, packs or shaders",
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Horizon files", extensions: ["hmod", "hnmod", "hpack", "hshader", "zip"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (result.canceled) return [];
  return importFiles(profileId, result.filePaths);
}

export async function toggleLocal(profileId: string, name: string, enable: boolean): Promise<string> {
  const folder = modsDir(profileId);
  const current = join(folder, name);
  if (!existsSync(current)) throw new Error("E_NOT_FOUND");
  const disabled = name.endsWith(".disabled");
  if (enable === !disabled) return name;
  const nextName = enable ? name.slice(0, -".disabled".length) : `${name}.disabled`;
  const next = join(folder, nextName);
  if (existsSync(next)) throw new Error("E_EXISTS");
  await rename(current, next);
  return nextName;
}

export async function removeLocal(profileId: string, name: string): Promise<void> {
  const full = join(modsDir(profileId), name);
  if (!existsSync(full)) throw new Error("E_NOT_FOUND");
  await shell.trashItem(full);
}

export async function revealMods(profileId: string): Promise<void> {
  const folder = modsDir(profileId);
  await mkdir(folder, { recursive: true });
  const error = await shell.openPath(folder);
  if (error) throw new Error(error);
}

export function isModExtension(ext: string): boolean {
  return MOD_EXTENSIONS.has(ext.toLowerCase());
}
