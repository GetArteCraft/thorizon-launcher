import type {
  AppInfo,
  DiagnosticsSummary,
  EditorManifest,
  EnvState,
  InstallProgress,
  LocalFile,
  Profile,
  ServerEntry,
  Settings,
  UpdateState,
  AddServerInput,
  UsageStats,
} from "./types";

export interface PlayResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface ExportResult {
  path: string | null;
  issues: Array<{ level: "error" | "warn"; code: string; ids: string[]; message: string }>;
}

export interface LauncherApi {
  appInfo(): Promise<AppInfo>;
  checkEnv(): Promise<EnvState>;
  pickCli(): Promise<EnvState | null>;
  signIn(): Promise<PlayResult>;
  openExternal(url: string): Promise<void>;
  openPath(kind: "userData" | "profiles" | "logs" | "cache" | "profile", id?: string): Promise<void>;

  settingsGet(): Promise<Settings>;
  settingsSet(patch: Partial<Settings>): Promise<Settings>;
  settingsReset(): Promise<Settings>;

  windowMinimize(): Promise<void>;
  windowToggleMaximize(): Promise<boolean>;
  windowClose(): Promise<void>;
  windowIsMaximized(): Promise<boolean>;

  profilesList(): Promise<Profile[]>;
  profilesCreate(input: {
    id?: string;
    name: string;
    packId: string | null;
    packName: string;
    version: string;
    game: string;
    source: Profile["source"];
    mods: number;
    pinned?: number;
    note?: string;
  }): Promise<Profile>;
  profilesDelete(id: string): Promise<void>;
  profilesPlay(id: string): Promise<PlayResult>;
  profilesNativeBuild(id: string): Promise<PlayResult>;
  profilesOpen(id: string): Promise<void>;
  backupsCreate(profileId: string): Promise<{ path: string; files: number; bytes: number } | null>;
  profilesUpdateLaunch(
    id: string,
    launch: Pick<Settings, "launchMode" | "launchWidth" | "launchHeight" | "launchArgs" | "hideLauncherOnPlay">,
  ): Promise<Profile>;

  installStart(id: string): Promise<void>;
  installCancel(): Promise<boolean>;
  modsInstall(modId: string, profileId: string): Promise<PlayResult>;

  localList(profileId: string): Promise<LocalFile[]>;
  localPick(profileId: string): Promise<string[]>;
  localImport(profileId: string, paths: string[]): Promise<string[]>;
  localToggle(profileId: string, name: string, enable: boolean): Promise<string>;
  localRemove(profileId: string, name: string): Promise<void>;
  localReveal(profileId: string): Promise<void>;
  projectInstall(projectId: string, profileId: string): Promise<{
    name: string;
    path: string;
    size: number;
    sha256: string;
  }>;
  getFilePath(file: File): string;

  serversList(): Promise<ServerEntry[]>;
  serversAdd(input: AddServerInput): Promise<ServerEntry>;
  serversRemove(id: string): Promise<void>;
  serversPing(id: string): Promise<ServerEntry | null>;
  serversStart(id: string): Promise<void>;
  serversStop(): Promise<boolean>;
  serversCommand(command: string): Promise<boolean>;

  logsRead(source: "app" | "cli", lines?: number): Promise<string>;
  logsOpenFolder(): Promise<void>;

  diagnosticsSummary(): Promise<DiagnosticsSummary>;
  diagnosticsSave(): Promise<string | null>;
  diagnosticsCopy(): Promise<string>;
  stats(): Promise<UsageStats>;

  editorExport(manifest: EditorManifest): Promise<ExportResult>;

  updatesState(): Promise<UpdateState>;
  updatesCheck(): Promise<UpdateState>;
  updatesDownload(): Promise<void>;
  updatesInstall(): Promise<void>;

  cacheSize(): Promise<number>;
  cacheClear(): Promise<number>;

  quit(): Promise<void>;

  onInstallProgress(cb: (progress: InstallProgress) => void): () => void;
  onNativeLine(cb: (payload: { id: string; line: string }) => void): () => void;
  onModsLine(cb: (payload: { id: string; line: string }) => void): () => void;
  onProjectProgress(cb: (payload: { projectId: string; percent: number; phase: "downloading" | "verifying" | "done" }) => void): () => void;
  onServerLine(cb: (payload: { id: string; line: string }) => void): () => void;
  onUpdateState(cb: (state: UpdateState) => void): () => void;
  onNavigate(cb: (tab: string) => void): () => void;
  onWindowState(cb: (maximized: boolean) => void): () => void;
}
