import { dialog } from "electron";
import JSZip from "jszip";
import { writeFile } from "node:fs/promises";
import { getProject } from "./catalog";
import { log } from "./logger";
import { ID_PATTERN, VERSION_PATTERN, tomlManifest, validateSelection } from "../shared/editor";
import type { EditorManifest } from "../shared/types";

export interface ExportResult {
  path: string | null;
  issues: ReturnType<typeof validateSelection>;
}

export async function exportPack(manifest: EditorManifest): Promise<ExportResult> {
  const lookup = (id: string) => getProject(id);
  const issues = validateSelection(
    manifest.mods.map((mod) => mod.id),
    lookup,
  );

  if (!ID_PATTERN.test(manifest.id)) issues.push({ level: "error", code: "id", ids: [], message: "Pack id must match [a-z0-9_]{1,64}." });
  if (!VERSION_PATTERN.test(manifest.version)) issues.push({ level: "error", code: "version", ids: [], message: "Version may contain letters, digits, dots, dashes and underscores." });
  if (!manifest.name.trim()) issues.push({ level: "error", code: "name", ids: [], message: "Pack name is empty." });
  if (manifest.mods.length === 0) issues.push({ level: "error", code: "empty", ids: [], message: "Add at least one mod." });

  if (issues.some((issue) => issue.level === "error")) {
    return { path: null, issues };
  }

  const hashes: Record<string, string | null> = {};
  for (const mod of manifest.mods) {
    const hash = getProject(mod.id)?.latest?.file?.sha256 ?? null;
    hashes[mod.id] = hash;
    if (!hash) {
      issues.push({
        level: "error",
        code: "hash",
        ids: [mod.id],
        message: `${mod.id} has no published SHA-256 and cannot be pinned in an .hpack.`,
      });
    }
  }

  if (issues.some((issue) => issue.level === "error")) {
    return { path: null, issues };
  }

  const toml = tomlManifest(manifest, hashes);
  const zip = new JSZip();
  zip.file("horizon-modpack.toml", toml);
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  const target = await dialog.showSaveDialog({
    title: "Save the pack",
    defaultPath: `${manifest.id}-${manifest.version}.hpack`,
    filters: [{ name: "Horizon pack", extensions: ["hpack"] }],
  });
  if (target.canceled || !target.filePath) return { path: null, issues };

  await writeFile(target.filePath, buffer);
  log("info", "editor", `exported ${manifest.id} (${manifest.mods.length} mods)`);
  return { path: target.filePath, issues };
}
