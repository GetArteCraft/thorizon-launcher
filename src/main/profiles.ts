import { app, shell } from "electron";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { getSettings } from "./settings";
import { runCli } from "./cli";
import { log } from "./logger";
import { bump } from "./stats";
import { maybeBackup } from "./backups";
import type { LaunchConfig, Profile } from "../shared/types";

export function profilesRoot(): string {
  const configured = getSettings().profilesDir.trim();
  return configured ? resolve(configured) : join(app.getPath("userData"), "profiles");
}

function safeId(value: string): string {
  const id = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return id || `profile_${Date.now().toString(36)}`;
}

async function directorySize(path: string, depth = 0): Promise<number> {
  if (depth > 6) return 0;
  try {
    const entries = await readdir(path, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) total += await directorySize(full, depth + 1);
      else if (entry.isFile()) {
        try {
          total += (await stat(full)).size;
        } catch {
          // файл мог исчезнуть между readdir и stat
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function listLocalProfiles(): Promise<Profile[]> {
  const root = profilesRoot();
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true });
  const profiles: Profile[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = join(root, entry.name);
    try {
      const profile = JSON.parse(await readFile(join(folder, "profile.json"), "utf8")) as Profile;
      if (!profile?.id) continue;
      profiles.push({ ...profile, path: folder, sizeBytes: await directorySize(folder) });
    } catch {
      // не наша папка — пропускаем
    }
  }
  return profiles.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** CLI хранит профили сам; читаем их только для показа, не редактируем. */
async function listCliProfiles(): Promise<Profile[]> {
  const result = await runCli(["modpack", "list", "--json"], { timeoutMs: 15_000 });
  if (!result.ok) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { packs?: unknown }).packs)
      ? ((parsed as { packs: unknown[] }).packs ?? [])
      : [];

  return rows
    .map((row): Profile | null => {
      if (typeof row !== "object" || row === null) return null;
      const item = row as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id : typeof item.name === "string" ? safeId(item.name) : null;
      if (!id) return null;
      return {
        id,
        name: typeof item.name === "string" ? item.name : id,
        packId: id,
        packName: typeof item.name === "string" ? item.name : id,
        version: typeof item.version === "string" ? item.version : "—",
        game: typeof item.game === "string" ? item.game : "26.3",
        source: "cli",
        path: join(app.getPath("userData"), "horizon-packs", id),
        mods: typeof item.mods === "number" ? item.mods : 0,
        sizeBytes: 0,
        createdAt: typeof item.created === "string" ? item.created : new Date().toISOString(),
        lastPlayed: typeof item.last_played === "string" ? item.last_played : null,
        pinned: 0,
        launch: null,
      };
    })
    .filter((profile): profile is Profile => profile !== null);
}

export async function listProfiles(): Promise<Profile[]> {
  const [local, cli] = await Promise.all([listLocalProfiles(), listCliProfiles()]);
  const seen = new Set(local.map((profile) => profile.id));
  return [...local, ...cli.filter((profile) => !seen.has(profile.id))];
}

export interface CreateProfileInput {
  id?: string;
  name: string;
  packId: string | null;
  packName: string;
  version: string;
  game: string;
  source: Profile["source"];
  mods: number;
  pinned?: number;
  note?: string;
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const id = safeId(input.id || input.packId || input.name);
  const folder = join(profilesRoot(), id);
  await mkdir(join(folder, "mods"), { recursive: true });
  await mkdir(join(folder, "home"), { recursive: true });

  const profile: Profile = {
    id,
    name: input.name,
    packId: input.packId,
    packName: input.packName,
    version: input.version,
    game: input.game,
    source: input.source,
    path: folder,
    mods: input.mods,
    sizeBytes: 0,
    createdAt: new Date().toISOString(),
    lastPlayed: null,
    pinned: input.pinned ?? 0,
    launch: null,
    note: input.note,
  };

  await writeFile(join(folder, "profile.json"), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  log("info", "profiles", `created ${id}`);
  return profile;
}

export async function deleteProfile(id: string): Promise<void> {
  const profile = (await listLocalProfiles()).find((item) => item.id === id);
  if (!profile) throw new Error("E_NOT_LOCAL");
  await shell.trashItem(profile.path);
  log("info", "profiles", `trashed ${id}`);
}

export async function updateProfileLaunch(id: string, launch: LaunchConfig): Promise<Profile> {
  const profile = (await listLocalProfiles()).find((item) => item.id === id);
  if (!profile) throw new Error("E_NOT_LOCAL");
  const next: Profile = { ...profile, launch };
  await writeFile(join(profile.path, "profile.json"), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function openProfile(id: string): Promise<void> {
  const profile = (await listProfiles()).find((item) => item.id === id);
  if (!profile) throw new Error("E_NOT_FOUND");
  await shell.openPath(profile.path);
}

export interface PlayResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

async function applyLaunchOptions(profile: Profile): Promise<void> {
  const settings = getSettings();
  const config = profile.launch ?? {
    launchMode: settings.launchMode,
    launchWidth: settings.launchWidth,
    launchHeight: settings.launchHeight,
    launchArgs: settings.launchArgs,
    hideLauncherOnPlay: settings.hideLauncherOnPlay,
  };
  const home = join(profile.path, "home");
  if (!existsSync(home)) return;

  const file = join(home, "options.txt");
  let lines: string[] = [];
  try {
    lines = (await readFile(file, "utf8")).split(/\r?\n/);
  } catch {
    lines = [];
  }

  const values = new Map<string, string>();
  for (const line of lines) {
    const index = line.indexOf(":");
    if (index > 0) values.set(line.slice(0, index), line.slice(index + 1));
  }
  values.set("overrideWidth", String(config.launchWidth));
  values.set("overrideHeight", String(config.launchHeight));
  values.set("fullscreen", config.launchMode === "fullscreen" ? "true" : "false");

  await writeFile(
    file,
    `${[...values.entries()].map(([key, value]) => `${key}:${value}`).join("\n")}\n`,
    "utf8",
  );
}

/**
 * Игра запускается официальным CLI: он владеет аккаунтом и версией игры.
 * Локальный профиль без установленной сборки честно отказывает.
 */
export async function playProfile(id: string): Promise<PlayResult> {
  const profile = (await listProfiles()).find((item) => item.id === id);
  if (!profile) throw new Error("E_NOT_FOUND");
  if (profile.source !== "cli") {
    throw new Error("E_NOT_INSTALLED");
  }

  await applyLaunchOptions(profile);
  await maybeBackup(profile.id);

  const result = await runCli(["modpack", "play", profile.packId ?? id]);
  if (result.ok) {
    await bump("launches");
    const local = (await listLocalProfiles()).find((item) => item.id === id);
    if (local) {
      const next = { ...local, lastPlayed: new Date().toISOString() };
      await writeFile(join(local.path, "profile.json"), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    }
  }
  return result;
}
