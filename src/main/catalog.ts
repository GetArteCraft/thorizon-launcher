import packsJson from "../shared/data/packs.json";
import registryJson from "../shared/data/registry.json";
import { app } from "electron";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Catalog, Pack, Registry, RegistryProject } from "../shared/types";

export const catalog = packsJson as unknown as Catalog;
export const registry = registryJson as unknown as Registry;

export function getPack(id: string): Pack | undefined {
  return catalog.packs.find((pack) => pack.id === id);
}

export function getProject(id: string): RegistryProject | undefined {
  return [...registry.mods, ...registry.shaders, ...registry.resourcepacks].find(
    (project) => project.id === id,
  );
}

export function projectHash(id: string): string | null {
  return getProject(id)?.latest?.file?.sha256 ?? null;
}

export function packModIds(pack: Pack): string[] {
  return pack.mods.map((mod) => mod.id);
}

/** Папка с ресурсами: в dev — рядом с исходниками, в установленной — process.resourcesPath. */
export function resourcesRoot(): string {
  return app.isPackaged ? join(process.resourcesPath, "resources") : join(app.getAppPath(), "resources");
}

/**
 * Локальный индекс для официального CLI: 158 проектов + наши сборки, где
 * манифесты .hpack лежат рядом (file://). Без этого install требует живой CDN.
 */
export async function localCatalogIndex(): Promise<string | null> {
  const catalogDir = join(resourcesRoot(), "catalog");
  const source = join(catalogDir, "index.json");
  if (!existsSync(source)) return null;
  try {
    const index = JSON.parse(await readFile(source, "utf8")) as {
      schema?: number;
      generated?: string;
      projects?: Array<{
        kind?: string;
        versions?: Array<{ file?: { url?: string; name?: string } }>;
      }>;
    };
    for (const project of index.projects ?? []) {
      if (project.kind !== "modpack") continue;
      for (const version of project.versions ?? []) {
        const url = version.file?.url;
        if (url?.startsWith("files/")) {
          version.file!.url = pathToFileURL(join(catalogDir, url)).href;
        }
      }
    }
    const target = join(app.getPath("userData"), "cache", "catalog-index.json");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(index)}\n`, "utf8");
    return target;
  } catch {
    return null;
  }
}
