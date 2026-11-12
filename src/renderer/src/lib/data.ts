import packsJson from "@shared/data/packs.json";
import registryJson from "@shared/data/registry.json";
import type { Catalog, Pack, Registry, RegistryProject } from "@shared/types";

export const catalog = packsJson as unknown as Catalog;
export const registry = registryJson as unknown as Registry;
export const packs = catalog.packs;
export const allProjects: RegistryProject[] = [
  ...registry.mods,
  ...registry.shaders,
  ...registry.resourcepacks,
];

export const featuredPack = packs.find((pack) => pack.id === "better_plus") ?? packs[0]!;

export function packSummary(pack: Pack | undefined, locale: string): string {
  if (!pack) return "";
  return pack.localeSummaries[locale] ?? pack.summary;
}

export function projectById(id: string): RegistryProject | undefined {
  return allProjects.find((project) => project.id === id);
}

export function iconFor(pack: Pack | undefined): string {
  if (!pack) return "./icons/packs/better_plus.png";
  const file = pack.icon.split("/").pop() ?? `${pack.id}.png`;
  return `./icons/packs/${file}`;
}

export function packsWithMod(id: string): Pack[] {
  return packs.filter((pack) => pack.mods.some((mod) => mod.id === id));
}

export function categories(): Array<{ id: string; label: string; count: number }> {
  const map = new Map<string, { label: string; count: number }>();
  for (const pack of packs) {
    pack.categories.forEach((id, index) => {
      const label = pack.categoryLabels[index] ?? id;
      const current = map.get(id);
      map.set(id, { label, count: (current?.count ?? 0) + 1 });
    });
  }
  return [...map.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function kindLabel(kind: RegistryProject["kind"], locale: string): string {
  const ru = locale === "ru";
  switch (kind) {
    case "native-mod":
      return ru ? "Нативный порт" : "Native port";
    case "mod":
      return ru ? "Контентный пак" : "Content pack";
    case "shader":
      return ru ? "Шейдер" : "Shader";
    case "resourcepack":
      return ru ? "Ресурспак" : "Resource pack";
  }
}

export function toneForKind(kind: RegistryProject["kind"]): string {
  switch (kind) {
    case "native-mod":
      return "mint";
    case "mod":
      return "blue";
    case "shader":
      return "violet";
    case "resourcepack":
      return "amber";
  }
}

export function monogram(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}
