import { create } from "zustand";
import { DEFAULT_SETTINGS } from "@shared/settings";
import type {
  DetailKind,
  EnvState,
  InstallProgress,
  Profile,
  ServerEntry,
  Settings,
  UpdateState,
} from "@shared/types";

export type Tab =
  | "home"
  | "packs"
  | "mods"
  | "shaders"
  | "resourcepacks"
  | "servers"
  | "instances"
  | "library"
  | "editor"
  | "settings"
  | "diagnostics";

export interface Detail {
  kind: DetailKind;
  id: string;
}

export interface Toast {
  id: number;
  kind: "info" | "success" | "error";
  text: string;
}

interface UiState {
  ready: boolean;
  tab: Tab;
  detail: Detail | null;
  palette: boolean;
  onboarding: boolean;
  settings: Settings;
  env: EnvState | null;
  profiles: Profile[];
  servers: ServerEntry[];
  installs: Record<string, InstallProgress>;
  update: UpdateState;
  consoleLines: string[];
  consoleServer: string | null;
  toasts: Toast[];
  editorSeed: string[];
  native: Record<string, { lines: string[]; running: boolean; ok?: boolean }>;

  navigate(tab: Tab): void;
  openDetail(kind: DetailKind, id: string): void;
  closeDetail(): void;
  setPalette(open: boolean): void;
  setOnboarding(open: boolean): void;
  setSettings(settings: Settings): void;
  setEnv(env: EnvState | null): void;
  setProfiles(profiles: Profile[]): void;
  setServers(servers: ServerEntry[]): void;
  setReady(ready: boolean): void;
  setInstall(progress: InstallProgress): void;
  clearInstall(id: string): void;
  setUpdate(update: UpdateState): void;
  setConsole(serverId: string | null, lines?: string[]): void;
  appendConsole(line: string): void;
  pushToast(kind: Toast["kind"], text: string): void;
  dismissToast(id: number): void;
  seedEditor(ids: string[]): void;
  startNative(id: string): void;
  appendNative(id: string, line: string): void;
  finishNative(id: string, ok: boolean): void;
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  ready: false,
  tab: "home",
  detail: null,
  palette: false,
  onboarding: false,
  settings: DEFAULT_SETTINGS,
  env: null,
  profiles: [],
  servers: [],
  installs: {},
  update: { status: "idle" },
  consoleLines: [],
  consoleServer: null,
  toasts: [],
  editorSeed: [],
  native: {},

  navigate: (tab) => set({ tab, detail: null }),
  openDetail: (kind, id) =>
    set({
      detail: { kind, id },
      tab:
        kind === "pack"
          ? "packs"
          : kind === "mod"
            ? "mods"
            : kind === "shader"
              ? "shaders"
              : "resourcepacks",
    }),
  closeDetail: () => set({ detail: null }),
  setPalette: (open) => set({ palette: open }),
  setOnboarding: (open) => set({ onboarding: open }),
  setSettings: (settings) => set({ settings }),
  setEnv: (env) => set({ env }),
  setProfiles: (profiles) => set({ profiles }),
  setServers: (servers) => set({ servers }),
  setReady: (ready) => set({ ready }),
  setInstall: (progress) =>
    set((state) => ({ installs: { ...state.installs, [progress.id]: progress } })),
  clearInstall: (id) =>
    set((state) => {
      const next = { ...state.installs };
      delete next[id];
      return { installs: next };
    }),
  setUpdate: (update) => set({ update }),
  setConsole: (serverId, lines = []) => set({ consoleServer: serverId, consoleLines: lines }),
  appendConsole: (line) =>
    set((state) => ({ consoleLines: [...state.consoleLines.slice(-400), line] })),
  pushToast: (kind, text) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, kind, text }] }));
    setTimeout(() => get().dismissToast(id), 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  seedEditor: (ids) => set({ editorSeed: [...new Set(ids)] }),
  startNative: (id) =>
    set((state) => ({ native: { ...state.native, [id]: { lines: [], running: true } } })),
  appendNative: (id, line) =>
    set((state) => {
      const current = state.native[id] ?? { lines: [], running: true };
      return {
        native: {
          ...state.native,
          [id]: { ...current, lines: [...current.lines.slice(-300), line] },
        },
      };
    }),
  finishNative: (id, ok) =>
    set((state) => {
      const current = state.native[id] ?? { lines: [], running: false };
      return { native: { ...state.native, [id]: { ...current, running: false, ok } } };
    }),
}));
