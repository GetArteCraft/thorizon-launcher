import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join } from "node:path";
import { checkEnv, runCli } from "./cli";
import { getSettings, resetSettings, saveSettings } from "./settings";
import { setLogLevel } from "./logger";
import { cancelInstall, installPack } from "./install";
import { addServer, listServers, pingAndStore, removeServer, startServer, stopServer } from "./servers";
import { createProfile, deleteProfile, listProfiles, openProfile, playProfile, profilesRoot, updateProfileLaunch } from "./profiles";
import { importFiles, listLocal, pickAndImport, removeLocal, revealMods, toggleLocal } from "./localFiles";
import {
  cacheSize,
  clearCache,
  copyReport,
  diagnosticsSummary,
  openLogsFolder,
  saveReport,
} from "./diagnostics";
import { exportPack } from "./editor";
import { installProjectFile } from "./projectInstall";
import { getStats } from "./stats";
import { checkForUpdates, downloadUpdate, installUpdate, updateState } from "./updater";
import { log, readLog } from "./logger";
import type { AddServerInput, EditorManifest, Settings } from "../shared/types";

export interface IpcContext {
  getWindow: () => BrowserWindow | null;
  showWindow: () => void;
  onSettingsChanged: () => void;
}

function fail(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(message);
}

import { applyAutostart } from "./autostart";

export function registerIpc(context: IpcContext): void {
  const window = () => context.getWindow();

  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    electron: process.versions.electron ?? "",
    node: process.versions.node,
    chrome: process.versions.chrome ?? "",
    platform: process.platform,
    arch: process.arch,
    paths: {
      userData: app.getPath("userData"),
      profiles: profilesRoot(),
      logs: join(app.getPath("userData"), "logs"),
      cache: join(app.getPath("userData"), "cache"),
    },
  }));

  ipcMain.handle("env:check", () => checkEnv());

  ipcMain.handle("env:sign-in", async () => {
    const result = await runCli(["account", "sign-in"]);
    return result;
  });

  ipcMain.handle("env:pick-cli", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select horizon-launcher",
      properties: ["openFile"],
      filters:
        process.platform === "win32"
          ? [{ name: "horizon-launcher", extensions: ["exe"] }]
          : [{ name: "All files", extensions: ["*"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    saveSettings({ cliPath: result.filePaths[0] });
    context.onSettingsChanged();
    return checkEnv();
  });

  ipcMain.handle("shell:external", async (_event, url: unknown) => {
    if (typeof url !== "string" || !/^(https:|mailto:)/i.test(url)) throw new Error("E_URL");
    await shell.openExternal(url);
  });

  ipcMain.handle("shell:path", async (_event, kind: unknown, id: unknown) => {
    if (kind === "profile" && typeof id === "string") return openProfile(id);
    const paths = {
      userData: app.getPath("userData"),
      profiles: profilesRoot(),
      logs: join(app.getPath("userData"), "logs"),
      cache: join(app.getPath("userData"), "cache"),
    };
    if (kind === "profiles" || kind === "userData" || kind === "logs" || kind === "cache") {
      await shell.openPath(paths[kind]);
      return;
    }
    throw new Error("E_PATH");
  });

  ipcMain.handle("settings:get", () => getSettings());
  ipcMain.handle("settings:set", (_event, patch: Partial<Settings>) => {
    const next = saveSettings(patch ?? {});
    setLogLevel(next.logLevel);
    if ("autostart" in (patch ?? {}) || "autostartMinimized" in (patch ?? {})) applyAutostart(next);
    context.onSettingsChanged();
    return next;
  });
  ipcMain.handle("settings:reset", () => {
    const next = resetSettings();
    setLogLevel(next.logLevel);
    applyAutostart(next);
    context.onSettingsChanged();
    return next;
  });

  ipcMain.handle("window:minimize", () => window()?.minimize());
  ipcMain.handle("window:close", () => window()?.close());
  ipcMain.handle("window:is-maximized", () => window()?.isMaximized() ?? false);
  ipcMain.handle("window:toggle-maximize", () => {
    const win = window();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });

  ipcMain.handle("profiles:list", () => listProfiles());
  ipcMain.handle("profiles:create", (_event, input: Parameters<typeof createProfile>[0]) =>
    createProfile(input),
  );
  ipcMain.handle("profiles:delete", (_event, id: string) => deleteProfile(id));
  ipcMain.handle("profiles:open", (_event, id: string) => openProfile(id));
  ipcMain.handle("profiles:update-launch", (_event, id: string, launch: Parameters<typeof updateProfileLaunch>[1]) =>
    updateProfileLaunch(id, launch),
  );
  ipcMain.handle("profiles:play", async (_event, id: string) => {
    const settings = getSettings();
    if (settings.hideLauncherOnPlay) window()?.hide();
    try {
      return await playProfile(id);
    } catch (error) {
      if (settings.hideLauncherOnPlay) context.showWindow();
      fail(error);
    }
  });

  ipcMain.handle("profiles:native-build", async (event, id: string) => {
    const profiles = await listProfiles();
    const profile = profiles.find((item) => item.id === id);
    if (!profile) throw new Error("E_NOT_FOUND");
    if (profile.source !== "cli") throw new Error("E_NOT_INSTALLED");
    const instance = profile.packId ?? id;
    const result = await runCli(
      ["native-build", "--instance", instance, "--trust-native-code"],
      {
        onLine: (line) => {
          if (!event.sender.isDestroyed()) event.sender.send("native:line", { id, line });
        },
      },
    );
    if (result.ok) {
      const { bump } = await import("./stats");
      await bump("nativeBuilds");
    }
    return result;
  });

  ipcMain.handle("install:start", (event, id: string) => {
    void installPack(id, event.sender);
  });
  ipcMain.handle("install:cancel", () => cancelInstall());

  ipcMain.handle("local:list", (_event, profileId: string) => listLocal(profileId));
  ipcMain.handle("local:pick", (_event, profileId: string) => pickAndImport(profileId));
  ipcMain.handle("local:import", (_event, profileId: string, paths: string[]) => importFiles(profileId, paths));
  ipcMain.handle("local:toggle", (_event, profileId: string, name: string, enable: boolean) =>
    toggleLocal(profileId, name, enable),
  );
  ipcMain.handle("local:remove", (_event, profileId: string, name: string) => removeLocal(profileId, name));
  ipcMain.handle("local:reveal", (_event, profileId: string) => revealMods(profileId));
  ipcMain.handle("project:install", (event, projectId: string, profileId: string) =>
    installProjectFile(projectId, profileId, event.sender),
  );

  ipcMain.handle("servers:list", () => listServers());
  ipcMain.handle("servers:add", (_event, input: AddServerInput) => addServer(input));
  ipcMain.handle("servers:remove", (_event, id: string) => removeServer(id));
  ipcMain.handle("servers:ping", (_event, id: string) => pingAndStore(id));
  ipcMain.handle("servers:start", async (event, id: string) => {
    try {
      await startServer(id, event.sender);
    } catch (error) {
      event.sender.send("server:line", { id, line: `Error: ${String(error)}` });
      fail(error);
    }
  });
  ipcMain.handle("servers:stop", () => stopServer());

  ipcMain.handle("logs:read", async (_event, source: "app" | "cli", lines = 400) => {
    if (source === "cli") {
      const result = await runCli(["logs", "--lines", String(lines)], { timeoutMs: 15_000 });
      if (result.ok) return result.stdout;
      return result.error === "E_NO_CLI" ? "Horizon CLI not found." : result.stderr || "No game log yet.";
    }
    return readLog(lines);
  });
  ipcMain.handle("logs:open", () => openLogsFolder());

  ipcMain.handle("diagnostics:summary", () => diagnosticsSummary());
  ipcMain.handle("diagnostics:save", () => saveReport());
  ipcMain.handle("diagnostics:copy", () => copyReport());
  ipcMain.handle("stats:get", () => getStats());

  ipcMain.handle("editor:export", (_event, manifest: EditorManifest) => exportPack(manifest));

  ipcMain.handle("updates:state", () => updateState());
  ipcMain.handle("updates:check", () => checkForUpdates());
  ipcMain.handle("updates:download", () => downloadUpdate());
  ipcMain.handle("updates:install", () => installUpdate());

  ipcMain.handle("cache:size", () => cacheSize());
  ipcMain.handle("cache:clear", () => clearCache());

  ipcMain.handle("app:quit", () => app.quit());

  log("info", "ipc", "handlers registered");
}
