import { app } from "electron";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_SETTINGS, normalizeSettings } from "../shared/settings";
import type { Settings } from "../shared/types";

let current: Settings | null = null;

export function settingsFile(): string {
  return join(app.getPath("userData"), "settings.json");
}

export function loadSettings(): Settings {
  if (current) return current;
  try {
    current = normalizeSettings(JSON.parse(readFileSync(settingsFile(), "utf8")));
  } catch {
    current = normalizeSettings({});
  }
  return current;
}

export function getSettings(): Settings {
  return current ?? loadSettings();
}

/** Атомарная запись: tmp + rename, чтобы падение не оставило половину файла. */
function writeAtomic(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, text, "utf8");
  try {
    renameSync(tmp, file);
  } catch {
    writeFileSync(file, text, "utf8");
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const merged = normalizeSettings({ ...getSettings(), ...patch });
  current = merged;
  writeAtomic(settingsFile(), `${JSON.stringify(merged, null, 2)}\n`);
  return merged;
}

export function resetSettings(): Settings {
  current = normalizeSettings(DEFAULT_SETTINGS);
  writeAtomic(settingsFile(), `${JSON.stringify(current, null, 2)}\n`);
  return current;
}
