import type { EditorManifest, RegistryProject } from "./types";

export interface Cluster {
  key: string;
  label: string;
  ids: string[];
}

/** Функциональные дубли из docs/05. В одной сборке — не больше одного мода кластера. */
export const CLUSTERS: Cluster[] = [
  { key: "item_viewer", label: "Recipe viewer", ids: ["jei", "justenoughitems", "roughlyenoughitems", "recipes"] },
  { key: "map_full", label: "Map", ids: ["atlas", "ayynoxs_map_pack", "minimap_worldmap_waypoints_reworked", "waymap", "waypoints"] },
  { key: "waypoints_only", label: "Waypoints", ids: ["waymap", "waypoints"] },
  { key: "appleskin", label: "Food HUD", ids: ["appleskin", "appleskin_horizon"] },
  { key: "armor_hud", label: "Armor HUD", ids: ["armor_status", "armorhud"] },
  { key: "hud_editor", label: "HUD editor", ids: ["hud_plus", "basic_hud"] },
  { key: "f3_screen", label: "Debug screen", ids: ["betterf3", "smartf3"] },
  { key: "look_at_info", label: "Look-at info", ids: ["jade", "lookat"] },
  { key: "zoom", label: "Zoom", ids: ["zoom", "zoomify", "classic_zoom"] },
  { key: "fullbright", label: "Fullbright", ids: ["fullbright", "fullbright_horizon", "fullbright_nofog"] },
  { key: "freecam", label: "Free camera", ids: ["fair_freecam", "freecam", "freecam_plus", "freecam_yannis", "freelook"] },
  { key: "mod_menu", label: "Mod menu", ids: ["mod_menu", "modmenu"] },
  { key: "mouse_tricks", label: "Mouse tweaks", ids: ["mousetricks", "mousetweaks"] },
  { key: "inventory_sort", label: "Inventory sorting", ids: ["clientsort", "inventory_profiles", "inventory_wizard"] },
  { key: "shulker_tooltip", label: "Shulker preview", ids: ["shulker_peek", "shulkerboxtooltip"] },
  { key: "tree_felling", label: "Tree felling", ids: ["chop", "treefall", "veinminer"] },
  { key: "harvest", label: "Right-click harvest", ids: ["right_click_crops", "rightharvest"] },
  { key: "voice", label: "Voice chat", ids: ["voicechat", "simple_voice_chat"] },
  { key: "first_person_body", label: "First-person body", ids: ["first_person_body", "firstpersonmodel"] },
  { key: "sprint_state", label: "Sprint state", ids: ["toggle_sprint", "movement_status"] },
  { key: "server_discovery", label: "Server discovery", ids: ["server_browser", "serverify"] },
  { key: "chat_heads", label: "Chat heads", ids: ["chat_heads_rust", "chatheads"] },
  { key: "schematic_tool", label: "Schematics", ids: ["horizonmatica", "schematics"] },
];

export const PAIRS: Array<{ native: string; content: string }> = [
  { native: "deepbore_quarry_native", content: "deepbore_quarry" },
  { native: "projecte_core", content: "projecte" },
  { native: "voltz_core", content: "voltz" },
  { native: "wayfarer_stones_native", content: "wayfarer_stones" },
];

export const POLICY_BLOCKED = new Set([
  "xtoxray",
  "baritone",
  "seedcrackerx",
  "imfast",
  "viahorizon",
  "compass_bar",
]);

export interface Issue {
  level: "error" | "warn";
  code: string;
  ids: string[];
  message: string;
}

export function validateSelection(
  ids: string[],
  lookup: (id: string) => RegistryProject | undefined,
): Issue[] {
  const issues: Issue[] = [];
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    issues.push({ level: "error", code: "duplicate", ids: [], message: "The same mod is selected twice." });
  }

  const selected = new Set(ids);
  for (const cluster of CLUSTERS) {
    const hits = cluster.ids.filter((id) => selected.has(id));
    if (hits.length > 1) {
      issues.push({
        level: "error",
        code: "cluster",
        ids: hits,
        message: `${cluster.label}: pick one of ${hits.join(", ")}.`,
      });
    }
  }

  for (const pair of PAIRS) {
    const hasNative = selected.has(pair.native);
    const hasContent = selected.has(pair.content);
    if (hasNative && !hasContent) {
      issues.push({
        level: "warn",
        code: "pair",
        ids: [pair.native],
        message: `${pair.native} needs ${pair.content}; install both.`,
      });
    }
    if (hasContent && !hasNative) {
      issues.push({
        level: "warn",
        code: "pair",
        ids: [pair.content],
        message: `${pair.content} does nothing without ${pair.native}.`,
      });
    }
  }

  for (const id of ids) {
    if (POLICY_BLOCKED.has(id)) {
      issues.push({
        level: "error",
        code: "policy",
        ids: [id],
        message: `${id} is not allowed in public packs.`,
      });
    }
    const project = lookup(id);
    if (!project) {
      issues.push({ level: "error", code: "missing", ids: [id], message: `${id} is not in the registry.` });
    } else if (!project.latest?.file?.sha256) {
      issues.push({
        level: "warn",
        code: "hash",
        ids: [id],
        message: `${id} has no published SHA-256.`,
      });
    } else if (project.kind === "shader" || project.kind === "resourcepack") {
      issues.push({
        level: "error",
        code: "kind",
        ids: [id],
        message: `${id} is not a mod and cannot go into an .hpack.`,
      });
    }
  }

  return issues;
}

function q(value: string): string {
  return JSON.stringify(value);
}

/** .hpack = ZIP с horizon-modpack.toml; модов внутри нет. */
export function tomlManifest(
  manifest: EditorManifest,
  hashes: Record<string, string | null>,
): string {
  const lines = [
    "format = 1",
    `id = ${q(manifest.id)}`,
    `name = ${q(manifest.name)}`,
    `version = ${q(manifest.version)}`,
    `description = ${q(manifest.description)}`,
    `authors = [${manifest.authors.map(q).join(", ")}]`,
    `game = ${q(manifest.game)}`,
    "",
  ];
  for (const mod of manifest.mods) {
    const hash = hashes[mod.id];
    if (!hash) continue;
    lines.push("[[mods]]", `id = ${q(mod.id)}`, `version = ${q(mod.version)}`, `sha256 = ${q(hash)}`, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export const ID_PATTERN = /^[a-z0-9_]{1,64}$/;
export const VERSION_PATTERN = /^[A-Za-z0-9._-]+$/;
