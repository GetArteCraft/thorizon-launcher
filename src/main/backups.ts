import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getSettings } from "./settings";
import { listProfiles } from "./profiles";
import { log } from "./logger";

export interface BackupResult {
  path: string;
  files: number;
  bytes: number;
}

async function measure(path: string): Promise<{ files: number; bytes: number }> {
  let files = 0;
  let bytes = 0;
  try {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        const nested = await measure(full);
        files += nested.files;
        bytes += nested.bytes;
      } else if (entry.isFile()) {
        files += 1;
        try {
          bytes += (await stat(full)).size;
        } catch {
          // файл исчез между readdir и stat
        }
      }
    }
  } catch {
    // пустая папка
  }
  return { files, bytes };
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

async function rotate(backupsDir: string, keep: number): Promise<void> {
  try {
    const entries = await readdir(backupsDir, { withFileTypes: true });
    const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const name of dirs.slice(0, Math.max(0, dirs.length - keep))) {
      await rm(join(backupsDir, name), { recursive: true, force: true });
    }
  } catch {
    // папки ещё нет
  }
}

function savesDir(profilePath: string): string {
  return join(profilePath, "home", "saves");
}

function newestBackup(backupsDir: string): Promise<number | null> {
  return readdir(backupsDir, { withFileTypes: true })
    .then(async (entries) => {
      const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      const last = dirs.at(-1);
      if (!last) return null;
      return (await stat(join(backupsDir, last))).mtimeMs;
    })
    .catch(() => null);
}

export async function createBackup(profileId: string, force = false): Promise<BackupResult | null> {
  const profile = (await listProfiles()).find((item) => item.id === profileId);
  if (!profile) throw new Error("E_NOT_FOUND");

  const settings = getSettings();
  const saves = savesDir(profile.path);
  if (!existsSync(saves)) return null;

  const backupsDir = join(profile.path, "backups");
  if (!force) {
    const last = await newestBackup(backupsDir);
    if (last !== null && Date.now() - last < settings.backupEveryMin * 60_000) return null;
  }

  const target = join(backupsDir, stamp());
  await mkdir(target, { recursive: true });
  await cp(saves, join(target, "saves"), { recursive: true, force: true });
  await rotate(backupsDir, settings.backupsToKeep);

  const size = await measure(target);
  log("info", "backups", `${profileId}: ${size.files} files, ${size.bytes} bytes`);
  return { path: target, ...size };
}

/** Вызывается перед Play и стартом сервера; уважает autoBackup и интервал. */
export async function maybeBackup(profileId: string): Promise<BackupResult | null> {
  if (!getSettings().autoBackup) return null;
  return createBackup(profileId, false);
}
