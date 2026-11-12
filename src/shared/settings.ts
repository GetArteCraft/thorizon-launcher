import type { Settings } from "./types";

export const SETTINGS_SCHEMA = 1;

export const DEFAULT_SETTINGS: Settings = {
  schema: 1,
  language: "auto",
  theme: "dark",
  sounds: false,
  soundVolume: 0.5,
  reducedMotion: false,
  quality: "auto",

  closeToTray: true,
  minimizeToTray: false,
  startMinimized: false,
  trayNotifications: true,
  singleInstance: true,
  rememberWindow: true,
  window: { width: 1280, height: 820, maximized: false },

  autostart: false,
  autostartMinimized: true,
  autostartOnBattery: false,
  autostartServer: false,
  launchGameOnStart: false,

  updateChannel: "stable",
  updateCheckHours: 6,
  updateAutoDownload: true,
  updateInstallOnExit: false,

  hardwareAcceleration: true,
  parallelDownloads: 4,
  speedLimitKbps: 0,

  launchMode: "windowed",
  launchWidth: 1280,
  launchHeight: 720,
  launchArgs: "",
  defaultProfile: null,
  hideLauncherOnPlay: false,

  profilesDir: "",
  autoBackup: true,
  backupEveryMin: 30,
  backupsToKeep: 10,
  importLimitMb: 256,

  upnp: true,
  portFrom: 25565,
  portTo: 25575,
  whitelist: true,
  serverConsole: true,

  telemetryEnabled: false,
  crashReports: false,
  logLevel: "info",

  cliPath: "horizon-launcher",
  catalogIndexUrl: "",
  dismissedOnboarding: false,
};

type Shape = Record<string, unknown>;

function isShape(value: unknown): value is Shape {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function text(value: unknown, fallback: string, max = 400): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Любой старый/битый конфиг мержится с дефолтами и не ломает приложение. */
export function normalizeSettings(input: unknown): Settings {
  const raw = isShape(input) ? input : {};
  const window = isShape(raw.window) ? raw.window : {};
  const d = DEFAULT_SETTINGS;

  return {
    schema: 1,
    language: text(raw.language, d.language, 12),
    theme: oneOf(raw.theme, ["dark", "light"] as const, d.theme),
    sounds: bool(raw.sounds, d.sounds),
    soundVolume:
      typeof raw.soundVolume === "number" && Number.isFinite(raw.soundVolume)
        ? Math.min(1, Math.max(0, raw.soundVolume))
        : d.soundVolume,
    reducedMotion: bool(raw.reducedMotion, d.reducedMotion),
    quality: oneOf(raw.quality, ["auto", "high", "low", "off"] as const, d.quality),

    closeToTray: bool(raw.closeToTray, d.closeToTray),
    minimizeToTray: bool(raw.minimizeToTray, d.minimizeToTray),
    startMinimized: bool(raw.startMinimized, d.startMinimized),
    trayNotifications: bool(raw.trayNotifications, d.trayNotifications),
    singleInstance: bool(raw.singleInstance, d.singleInstance),
    rememberWindow: bool(raw.rememberWindow, d.rememberWindow),
    window: {
      width: num(window.width, d.window.width, 1080, 3840),
      height: num(window.height, d.window.height, 700, 2160),
      x: typeof window.x === "number" ? Math.round(window.x) : undefined,
      y: typeof window.y === "number" ? Math.round(window.y) : undefined,
      maximized: bool(window.maximized, false),
    },

    autostart: bool(raw.autostart, d.autostart),
    autostartMinimized: bool(raw.autostartMinimized, d.autostartMinimized),
    autostartOnBattery: bool(raw.autostartOnBattery, d.autostartOnBattery),
    autostartServer: bool(raw.autostartServer, d.autostartServer),
    launchGameOnStart: bool(raw.launchGameOnStart, d.launchGameOnStart),

    updateChannel: oneOf(raw.updateChannel, ["stable", "beta"] as const, d.updateChannel),
    updateCheckHours: num(raw.updateCheckHours, d.updateCheckHours, 1, 48),
    updateAutoDownload: bool(raw.updateAutoDownload, d.updateAutoDownload),
    updateInstallOnExit: bool(raw.updateInstallOnExit, d.updateInstallOnExit),

    hardwareAcceleration: bool(raw.hardwareAcceleration, d.hardwareAcceleration),
    parallelDownloads: num(raw.parallelDownloads, d.parallelDownloads, 1, 8),
    speedLimitKbps: num(raw.speedLimitKbps, d.speedLimitKbps, 0, 1_000_000),

    launchMode: oneOf(raw.launchMode, ["windowed", "borderless", "fullscreen"] as const, d.launchMode),
    launchWidth: num(raw.launchWidth, d.launchWidth, 640, 7680),
    launchHeight: num(raw.launchHeight, d.launchHeight, 480, 4320),
    launchArgs: text(raw.launchArgs, d.launchArgs, 500),
    defaultProfile: typeof raw.defaultProfile === "string" ? raw.defaultProfile.slice(0, 80) : null,
    hideLauncherOnPlay: bool(raw.hideLauncherOnPlay, d.hideLauncherOnPlay),

    profilesDir: text(raw.profilesDir, d.profilesDir, 500),
    autoBackup: bool(raw.autoBackup, d.autoBackup),
    backupEveryMin: num(raw.backupEveryMin, d.backupEveryMin, 5, 240),
    backupsToKeep: num(raw.backupsToKeep, d.backupsToKeep, 1, 50),
    importLimitMb: num(raw.importLimitMb, d.importLimitMb, 1, 4096),

    upnp: bool(raw.upnp, d.upnp),
    portFrom: num(raw.portFrom, d.portFrom, 1024, 65535),
    portTo: num(raw.portTo, d.portTo, 1024, 65535),
    whitelist: bool(raw.whitelist, d.whitelist),
    serverConsole: bool(raw.serverConsole, d.serverConsole),

    telemetryEnabled: bool(raw.telemetryEnabled, d.telemetryEnabled),
    crashReports: bool(raw.crashReports, d.crashReports),
    logLevel: oneOf(raw.logLevel, ["error", "warn", "info", "debug"] as const, d.logLevel),

    cliPath: text(raw.cliPath, d.cliPath, 500) || d.cliPath,
    catalogIndexUrl: text(raw.catalogIndexUrl, d.catalogIndexUrl, 500),
    dismissedOnboarding: bool(raw.dismissedOnboarding, d.dismissedOnboarding),
  };
}
