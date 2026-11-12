import { app, dialog, shell } from "electron";
import JSZip from "jszip";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkEnv } from "./cli";
import { getSettings } from "./settings";
import { listProfiles } from "./profiles";
import { log, readLog, redact } from "./logger";
import type { DiagnosticsSummary } from "../shared/types";

export async function diagnosticsSummary(): Promise<DiagnosticsSummary> {
  const env = await checkEnv();
  return {
    generated: new Date().toISOString(),
    app: {
      version: app.getVersion(),
      electron: process.versions.electron ?? "",
      node: process.versions.node,
      chrome: process.versions.chrome ?? "",
      platform: process.platform,
      arch: process.arch,
    },
    env,
    settings: getSettings(),
    profiles: await listProfiles(),
    logs: readLog(400).split(/\r?\n/).filter(Boolean),
    paths: env.paths,
  };
}

export async function saveReport(): Promise<string | null> {
  const summary = await diagnosticsSummary();
  const safe = {
    ...summary,
    logs: summary.logs.map(redact),
  };

  const zip = new JSZip();
  zip.file("report.json", `${JSON.stringify(safe, null, 2)}\n`);
  zip.file("launcher.log", `${safe.logs.join("\n")}\n`);
  zip.file(
    "README.txt",
    [
      "THorizon launcher diagnostic report.",
      "Contains app versions, environment, profiles and the launcher log.",
      "No account tokens, passwords or world contents are included.",
      `Generated: ${summary.generated}`,
    ].join("\n"),
  );
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  const stamp = summary.generated.replace(/[:.]/g, "-").slice(0, 19);
  const target = await dialog.showSaveDialog({
    title: "Save the diagnostic report",
    defaultPath: `thorizon-report-${stamp}.zip`,
    filters: [{ name: "ZIP archive", extensions: ["zip"] }],
  });
  if (target.canceled || !target.filePath) return null;
  await writeFile(target.filePath, buffer);
  log("info", "diagnostics", "report saved");
  return target.filePath;
}

export async function copyReport(): Promise<string> {
  const summary = await diagnosticsSummary();
  const lines = [
    `THorizon ${summary.app.version} · Electron ${summary.app.electron} · ${summary.app.platform} ${summary.app.arch}`,
    `CLI: ${summary.env.cli ? summary.env.cliVersion : "not found"} (${summary.env.cliPath})`,
    `Profiles: ${summary.profiles.length}`,
    `Paths: ${summary.paths.userData}`,
    "",
    "Recent log:",
    ...summary.logs.slice(-40).map(redact),
  ];
  return lines.join("\n");
}

export async function openLogsFolder(): Promise<void> {
  const folder = join(app.getPath("userData"), "logs");
  await mkdir(folder, { recursive: true });
  await shell.openPath(folder);
}

export async function cacheSize(): Promise<number> {
  const folder = join(app.getPath("userData"), "cache");
  try {
    const { readdir, stat } = await import("node:fs/promises");
    const files = await readdir(folder);
    let total = 0;
    for (const file of files) {
      try {
        total += (await stat(join(folder, file))).size;
      } catch {
        // ignore
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function clearCache(): Promise<number> {
  const folder = join(app.getPath("userData"), "cache");
  try {
    const { readdir, unlink } = await import("node:fs/promises");
    const files = await readdir(folder);
    for (const file of files) await unlink(join(folder, file)).catch(() => undefined);
  } catch {
    // кэша нет — уже пусто
  }
  return 0;
}
