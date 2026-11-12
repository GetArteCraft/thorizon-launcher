import { app } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { UsageStats } from "../shared/types";

function file(): string {
  return join(app.getPath("userData"), "stats.json");
}

function empty(): UsageStats {
  return {
    installedPacks: 0,
    launches: 0,
    imports: 0,
    nativeBuilds: 0,
    since: new Date().toISOString(),
  };
}

export async function getStats(): Promise<UsageStats> {
  try {
    const parsed = JSON.parse(await readFile(file(), "utf8")) as Partial<UsageStats>;
    return { ...empty(), ...parsed, since: parsed.since ?? new Date().toISOString() };
  } catch {
    return empty();
  }
}

export async function bump(key: Exclude<keyof UsageStats, "since">, by = 1): Promise<void> {
  const stats = await getStats();
  stats[key] += by;
  const target = file();
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(stats, null, 2)}\n`, "utf8");
}
