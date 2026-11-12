/**
 * Общие типы main ↔ renderer. Никаких Electron-импортов: модуль можно тестировать в Node.
 */

export type RegistryKind = "native-mod" | "mod" | "shader" | "resourcepack";

export interface RegistryFile {
  name: string;
  url: string;
  size: number;
  sha256: string;
}

export interface RegistryVersion {
  version: string;
  published: string;
  game: string;
  api?: string;
  file?: RegistryFile;
}

export interface RegistryPair {
  id: string;
  name: string;
  kind: RegistryKind;
}

export interface RegistryProject {
  id: string;
  kind: RegistryKind;
  name: string;
  summary: string;
  description: string;
  authors: string[];
  owners: string[];
  license: string;
  source: string;
  categories: string[];
  tags: string[];
  downloads: number;
  pair: RegistryPair | null;
  latest: RegistryVersion | null;
}

export interface Registry {
  schema: number;
  generated: string;
  source: string;
  counts: { all: number; mods: number; shaders: number; resourcepacks: number };
  featuredMods: string[];
  featuredShaders: string[];
  mods: RegistryProject[];
  shaders: RegistryProject[];
  resourcepacks: RegistryProject[];
}

export interface PackModRef {
  id: string;
  version: string;
  license: string;
}

export interface PackRequirements {
  game: string;
  min_hooks: number;
  pins: number;
  mods: number;
  size_kb: number;
}

export interface PackDownload {
  name: string;
  url: string;
  size: number;
  sha256: string;
}

export interface Pack {
  id: string;
  name: string;
  summary: string;
  description: string;
  localeSummaries: Record<string, string>;
  version: string;
  published: string;
  changelog: string;
  game: string;
  categories: string[];
  categoryLabels: string[];
  categoryTones: string[];
  tags: string[];
  author: string;
  authorGithub: string;
  license: string;
  icon: string;
  screenshots: string[];
  requirements: PackRequirements;
  serverSafe: boolean;
  analog: string;
  mods: PackModRef[];
  download: PackDownload;
}

export interface CatalogBrand {
  name: string;
  tagline: string;
  domain: string;
  site: string;
  github: string;
  locales: string[];
}

export interface CatalogStats {
  packs: number;
  mods: number;
  shaders: number;
  resourcepacks: number;
  projects: number;
  uniqueMods: number;
}

export interface Catalog {
  schema: number;
  generated: string;
  brand: CatalogBrand;
  stats: CatalogStats;
  packs: Pack[];
}

export type LaunchMode = "windowed" | "borderless" | "fullscreen";
export type ThemeMode = "dark" | "light";
export type QualityMode = "auto" | "high" | "low" | "off";
export type LogLevel = "error" | "warn" | "info" | "debug";

export interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export interface Settings {
  schema: 1;
  language: string;
  theme: ThemeMode;
  sounds: boolean;
  soundVolume: number;
  reducedMotion: boolean;
  quality: QualityMode;

  closeToTray: boolean;
  minimizeToTray: boolean;
  startMinimized: boolean;
  trayNotifications: boolean;
  singleInstance: boolean;
  rememberWindow: boolean;
  window: WindowBounds;

  autostart: boolean;
  autostartMinimized: boolean;
  autostartOnBattery: boolean;
  autostartServer: boolean;
  launchGameOnStart: boolean;

  updateChannel: "stable" | "beta";
  updateCheckHours: number;
  updateAutoDownload: boolean;
  updateInstallOnExit: boolean;

  hardwareAcceleration: boolean;
  parallelDownloads: number;
  speedLimitKbps: number;

  launchMode: LaunchMode;
  launchWidth: number;
  launchHeight: number;
  launchArgs: string;
  defaultProfile: string | null;
  hideLauncherOnPlay: boolean;

  profilesDir: string;
  autoBackup: boolean;
  backupEveryMin: number;
  backupsToKeep: number;
  importLimitMb: number;

  upnp: boolean;
  portFrom: number;
  portTo: number;
  whitelist: boolean;
  serverConsole: boolean;

  telemetryEnabled: boolean;
  crashReports: boolean;
  logLevel: LogLevel;

  cliPath: string;
  catalogIndexUrl: string;
  dismissedOnboarding: boolean;
}

export type LaunchConfig = Pick<
  Settings,
  "launchMode" | "launchWidth" | "launchHeight" | "launchArgs" | "hideLauncherOnPlay"
>;

export interface Profile {
  id: string;
  name: string;
  packId: string | null;
  packName: string;
  version: string;
  game: string;
  source: "cli" | "local" | "editor";
  path: string;
  mods: number;
  sizeBytes: number;
  createdAt: string;
  lastPlayed: string | null;
  pinned: number;
  launch: LaunchConfig | null;
  note?: string;
}

export interface LocalFile {
  name: string;
  ext: string;
  kind: "mod" | "native-mod" | "pack" | "shader" | "resourcepack" | "archive" | "other";
  enabled: boolean;
  size: number;
  modified: string;
  sha256: string | null;
}

export interface ServerPing {
  online: boolean;
  latencyMs: number | null;
  checkedAt: string;
  message?: string;
}

export interface ServerEntry {
  id: string;
  name: string;
  host: string;
  port: number;
  packId: string | null;
  version: string;
  whitelist: boolean;
  addedAt: string;
  ping: ServerPing | null;
}

export interface AddServerInput {
  name: string;
  host: string;
  port: number;
  packId?: string | null;
  version?: string;
  whitelist?: boolean;
}

export interface EnvVersions {
  installed: string[];
  selected: string | null;
}

export interface EnvAccount {
  name: string | null;
  ownsJava: boolean | null;
}

export interface EnvState {
  cli: boolean;
  cliPath: string;
  cliVersion: string | null;
  versions: EnvVersions;
  account: EnvAccount;
  os: string;
  arch: string;
  appVersion: string;
  electron: string;
  node: string;
  paths: { userData: string; profiles: string; logs: string; cache: string };
  error?: string;
}

export interface AppInfo {
  version: string;
  electron: string;
  node: string;
  chrome: string;
  platform: string;
  arch: string;
  paths: EnvState["paths"];
}

export interface InstallProgress {
  id: string;
  phase: "queued" | "resolving" | "downloading" | "verifying" | "native" | "done" | "error";
  percent: number;
  line?: string;
  message?: string;
  code?: string;
}

export interface UpdateState {
  status: "idle" | "checking" | "available" | "downloading" | "ready" | "none" | "dev" | "error";
  version?: string;
  notes?: string;
  percent?: number;
  message?: string;
}

export interface DiagnosticsSummary {
  generated: string;
  app: { version: string; electron: string; node: string; chrome: string; platform: string; arch: string };
  env: EnvState;
  settings: Settings;
  profiles: Profile[];
  logs: string[];
  paths: EnvState["paths"];
}

export interface UsageStats {
  installedPacks: number;
  launches: number;
  imports: number;
  nativeBuilds: number;
  since: string;
}

export interface EditorMod {
  id: string;
  version: string;
  license: string;
}

export interface EditorManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  authors: string[];
  game: string;
  mods: EditorMod[];
}

export type DetailKind = "pack" | "mod" | "shader" | "resourcepack";
