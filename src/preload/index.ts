/**
 * Единственный мост renderer ↔ Node. contextIsolation + sandbox включены,
 * в renderer нет ни require, ни ipcRenderer — только window.api.
 */
import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { LauncherApi } from "../shared/api";
import type { InstallProgress, UpdateState } from "../shared/types";

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: unknown, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: LauncherApi = {
  appInfo: () => ipcRenderer.invoke("app:info"),
  checkEnv: () => ipcRenderer.invoke("env:check"),
  pickCli: () => ipcRenderer.invoke("env:pick-cli"),
  signIn: () => ipcRenderer.invoke("env:sign-in"),
  openExternal: (url) => ipcRenderer.invoke("shell:external", url),
  openPath: (kind, id) => ipcRenderer.invoke("shell:path", kind, id),

  settingsGet: () => ipcRenderer.invoke("settings:get"),
  settingsSet: (patch) => ipcRenderer.invoke("settings:set", patch),
  settingsReset: () => ipcRenderer.invoke("settings:reset"),

  windowMinimize: () => ipcRenderer.invoke("window:minimize"),
  windowToggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  windowClose: () => ipcRenderer.invoke("window:close"),
  windowIsMaximized: () => ipcRenderer.invoke("window:is-maximized"),

  profilesList: () => ipcRenderer.invoke("profiles:list"),
  profilesCreate: (input) => ipcRenderer.invoke("profiles:create", input),
  profilesDelete: (id) => ipcRenderer.invoke("profiles:delete", id),
  profilesPlay: (id) => ipcRenderer.invoke("profiles:play", id),
  profilesNativeBuild: (id) => ipcRenderer.invoke("profiles:native-build", id),
  profilesOpen: (id) => ipcRenderer.invoke("profiles:open", id),
  profilesUpdateLaunch: (id, launch) => ipcRenderer.invoke("profiles:update-launch", id, launch),

  installStart: (id) => ipcRenderer.invoke("install:start", id),
  installCancel: () => ipcRenderer.invoke("install:cancel"),

  localList: (profileId) => ipcRenderer.invoke("local:list", profileId),
  localPick: (profileId) => ipcRenderer.invoke("local:pick", profileId),
  localImport: (profileId, paths) => ipcRenderer.invoke("local:import", profileId, paths),
  localToggle: (profileId, name, enable) => ipcRenderer.invoke("local:toggle", profileId, name, enable),
  localRemove: (profileId, name) => ipcRenderer.invoke("local:remove", profileId, name),
  localReveal: (profileId) => ipcRenderer.invoke("local:reveal", profileId),
  projectInstall: (projectId, profileId) => ipcRenderer.invoke("project:install", projectId, profileId),
  getFilePath: (file) => webUtils.getPathForFile(file),

  serversList: () => ipcRenderer.invoke("servers:list"),
  serversAdd: (input) => ipcRenderer.invoke("servers:add", input),
  serversRemove: (id) => ipcRenderer.invoke("servers:remove", id),
  serversPing: (id) => ipcRenderer.invoke("servers:ping", id),
  serversStart: (id) => ipcRenderer.invoke("servers:start", id),
  serversStop: () => ipcRenderer.invoke("servers:stop"),

  logsRead: (source, lines) => ipcRenderer.invoke("logs:read", source, lines),
  logsOpenFolder: () => ipcRenderer.invoke("logs:open"),

  diagnosticsSummary: () => ipcRenderer.invoke("diagnostics:summary"),
  diagnosticsSave: () => ipcRenderer.invoke("diagnostics:save"),
  diagnosticsCopy: () => ipcRenderer.invoke("diagnostics:copy"),
  stats: () => ipcRenderer.invoke("stats:get"),

  editorExport: (manifest) => ipcRenderer.invoke("editor:export", manifest),

  updatesState: () => ipcRenderer.invoke("updates:state"),
  updatesCheck: () => ipcRenderer.invoke("updates:check"),
  updatesDownload: () => ipcRenderer.invoke("updates:download"),
  updatesInstall: () => ipcRenderer.invoke("updates:install"),

  cacheSize: () => ipcRenderer.invoke("cache:size"),
  cacheClear: () => ipcRenderer.invoke("cache:clear"),

  quit: () => ipcRenderer.invoke("app:quit"),

  onInstallProgress: (cb) => subscribe<InstallProgress>("install:progress", cb),
  onNativeLine: (cb) => subscribe<{ id: string; line: string }>("native:line", cb),
  onProjectProgress: (cb) =>
    subscribe<{ projectId: string; percent: number; phase: "downloading" | "verifying" | "done" }>(
      "project:progress",
      cb,
    ),
  onServerLine: (cb) => subscribe<{ id: string; line: string }>("server:line", cb),
  onUpdateState: (cb) => subscribe<UpdateState>("update:state", cb),
  onNavigate: (cb) => subscribe<string>("navigate", cb),
  onWindowState: (cb) => subscribe<boolean>("window:state", cb),
};

contextBridge.exposeInMainWorld("api", api);
