import { app } from "electron";
import { getSettings } from "./settings";
import { log } from "./logger";
import type { UpdateState } from "../shared/types";

type Listener = (state: UpdateState) => void;

let state: UpdateState = app.isPackaged
  ? { status: "idle" }
  : { status: "dev", message: "Updates are checked in the packaged build." };
let listener: Listener | null = null;
let autoUpdater: typeof import("electron-updater").autoUpdater | null = null;

export function onUpdateState(callback: Listener): void {
  listener = callback;
}

function setState(next: UpdateState): void {
  state = next;
  listener?.(next);
}

export function updateState(): UpdateState {
  return state;
}

async function loadUpdater(): Promise<typeof import("electron-updater").autoUpdater | null> {
  if (autoUpdater) return autoUpdater;
  try {
    const module = await import("electron-updater");
    autoUpdater = module.autoUpdater;
    autoUpdater.autoDownload = getSettings().updateAutoDownload;
    autoUpdater.on("checking-for-update", () => setState({ status: "checking" }));
    autoUpdater.on("update-available", (info) =>
      setState({ status: "available", version: info.version, notes: typeof info.releaseNotes === "string" ? info.releaseNotes : undefined }),
    );
    autoUpdater.on("update-not-available", () => setState({ status: "none" }));
    autoUpdater.on("download-progress", (progress) =>
      setState({ status: "downloading", version: state.version, percent: Math.round(progress.percent) }),
    );
    autoUpdater.on("update-downloaded", (info) => setState({ status: "ready", version: info.version }));
    autoUpdater.on("error", (error) => {
      log("warn", "updater", String(error));
      setState({ status: "error", message: String(error.message ?? error) });
    });
    return autoUpdater;
  } catch (error) {
    log("warn", "updater", String(error));
    return null;
  }
}

export async function checkForUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) {
    setState({ status: "dev", message: "Updates are checked in the packaged build." });
    return state;
  }
  const updater = await loadUpdater();
  if (!updater) {
    setState({ status: "error", message: "Updater is not available." });
    return state;
  }
  updater.channel = getSettings().updateChannel;
  updater.allowPrerelease = getSettings().updateChannel === "beta";
  await updater.checkForUpdates().catch((error: unknown) => {
    log("warn", "updater", String(error));
    setState({ status: "error", message: "Update check failed." });
  });
  return state;
}

export async function downloadUpdate(): Promise<void> {
  const updater = await loadUpdater();
  await updater?.downloadUpdate();
}

export function installUpdate(): void {
  autoUpdater?.quitAndInstall();
}
