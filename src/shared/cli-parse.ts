import type { EnvAccount, EnvVersions } from "./types";

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function collectStrings(value: unknown, keys: Set<string>, depth = 0): string[] {
  if (depth > 6 || value === null || typeof value !== "object") return [];
  const found: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && keys.has("$")) found.push(item);
      else found.push(...collectStrings(item, keys, depth + 1));
    }
    return found;
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && keys.has(key.toLowerCase())) found.push(item);
    else found.push(...collectStrings(item, keys, depth + 1));
  }
  return found;
}

function firstBoolean(value: unknown, keys: Set<string>, depth = 0): boolean | null {
  if (depth > 6 || value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstBoolean(item, keys, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "boolean" && keys.has(key.toLowerCase())) return item;
    const found = firstBoolean(item, keys, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/** CLI может печатать массив версий, объект или просто строки — разбираем всё. */
export function parseVersions(stdout: string): EnvVersions {
  const parsed = parseJson(stdout);
  const installed = parsed
    ? Array.from(new Set(collectStrings(parsed, new Set(["version", "name", "tag", "$"]))))
    : Array.from(stdout.matchAll(/\b\d{2}\.\d{1,2}(?:\.\d+)?\b/g)).map((match) => match[0]);
  const versions = installed.filter((item) => /\d/.test(item)).slice(0, 30);
  return { installed: versions, selected: versions[0] ?? null };
}

export function parseAccount(stdout: string): EnvAccount {
  const parsed = parseJson(stdout);
  if (!parsed) return { name: null, ownsJava: null };
  const names = collectStrings(parsed, new Set(["name", "username", "displayname", "player"]));
  const owns = firstBoolean(parsed, new Set(["owns_java", "ownsjava", "owns_minecraft", "entitled"]));
  return { name: names[0] ?? null, ownsJava: owns };
}
