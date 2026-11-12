import type { ChildProcess } from "node:child_process";
import type { WebContents } from "electron";
import { runCli } from "./cli";
import { getPack, localCatalogIndex } from "./catalog";
import { getSettings } from "./settings";
import { log } from "./logger";
import { bump } from "./stats";
import type { InstallProgress } from "../shared/types";

interface ActiveInstall {
  id: string;
  child: ChildProcess | null;
  canceled: boolean;
}

let active: ActiveInstall | null = null;

function percentFromLine(line: string, current: number): number {
  const percent = line.match(/(\d{1,3})\s*%/);
  if (percent) return Math.min(99, Number(percent[1]));
  const step = line.match(/\[(\d+)\s*\/\s*(\d+)\]/);
  if (step) {
    const done = Number(step[1]);
    const total = Number(step[2]);
    if (total > 0) return Math.min(99, Math.round((done / total) * 100));
  }
  return current;
}

function phaseFromLine(line: string): InstallProgress["phase"] | null {
  if (/resolv|fetch|index/i.test(line)) return "resolving";
  if (/download/i.test(line)) return "downloading";
  if (/verif|sha|hash/i.test(line)) return "verifying";
  if (/native|build|compil/i.test(line)) return "native";
  return null;
}

export function isInstalling(): boolean {
  return active !== null;
}

export function cancelInstall(): boolean {
  if (!active) return false;
  active.canceled = true;
  active.child?.kill();
  return true;
}

export async function installPack(id: string, sender: WebContents): Promise<void> {
  const pack = getPack(id);
  const send = (progress: InstallProgress) => {
    if (!sender.isDestroyed()) sender.send("install:progress", progress);
  };

  if (!pack) {
    send({ id, phase: "error", percent: 0, code: "E_NOT_FOUND", message: "Pack is not in the catalog" });
    return;
  }
  if (active) {
    send({ id, phase: "error", percent: 0, code: "E_BUSY", message: "Another install is running" });
    return;
  }

  const settings = getSettings();
  const env: Record<string, string> = {};
  const index = settings.catalogIndexUrl.trim() || (await localCatalogIndex());
  if (index) env.HORIZON_MOD_INDEX = index;

  active = { id, child: null, canceled: false };
  let percent = 2;
  let phase: InstallProgress["phase"] = "resolving";
  send({ id, phase, percent, message: pack.name });

  const result = await runCli(["mods", "install", "--source", "horizon", id], {
    env,
    onChild: (child) => {
      if (active) active.child = child;
    },
    onLine: (line) => {
      percent = percentFromLine(line, percent);
      phase = phaseFromLine(line) ?? phase;
      send({ id, phase, percent, line });
    },
  });

  const canceled = active?.canceled ?? false;
  active = null;

  if (canceled) {
    send({ id, phase: "error", percent, code: "E_CANCELED", message: "Install canceled" });
    return;
  }
  if (result.ok) {
    await bump("installedPacks");
    send({ id, phase: "done", percent: 100, message: `${pack.name} installed` });
    log("info", "install", `${id} installed`);
    return;
  }

  const code = result.error ?? (/E_TARGET|not found|unknown/i.test(result.stderr) ? "E_NOT_FOUND" : "E_INSTALL");
  send({
    id,
    phase: "error",
    percent,
    code,
    message: result.stderr.trim().split(/\r?\n/).slice(-1)[0] || "Install failed",
  });
  log("error", "install", `${id}: ${result.error ?? result.stderr}`);
}
