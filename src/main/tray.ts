import { app, Menu, Tray, nativeImage } from "electron";
import { join } from "node:path";
import { getSettings } from "./settings";

let tray: Tray | null = null;

export function resourcesDir(): string {
  return app.isPackaged ? join(process.resourcesPath, "resources") : join(app.getAppPath(), "resources");
}

export function iconPath(name: string): string {
  return join(resourcesDir(), name);
}

export interface TrayActions {
  show: () => void;
  play: () => void;
  settings: () => void;
  diagnostics: () => void;
  quit: () => void;
}

function labels() {
  const settings = getSettings();
  const ru = settings.language === "ru" || (settings.language === "auto" && app.getLocale().toLowerCase().startsWith("ru"));
  return ru
    ? { open: "Открыть", play: "Играть", settings: "Настройки", diagnostics: "Диагностика", quit: "Выход", idle: "Готов" }
    : { open: "Open", play: "Play", settings: "Settings", diagnostics: "Diagnostics", quit: "Quit", idle: "Ready" };
}

export function rebuildTray(actions: TrayActions, status = labels().idle): void {
  if (!tray) return;
  const text = labels();
  tray.setToolTip(`THorizon · ${status}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `THorizon · ${status}`, enabled: false },
      { type: "separator" },
      { label: text.open, click: actions.show },
      { label: text.play, click: actions.play },
      { type: "separator" },
      { label: text.settings, click: actions.settings },
      { label: text.diagnostics, click: actions.diagnostics },
      { type: "separator" },
      { label: text.quit, click: actions.quit },
    ]),
  );
}

export function createTray(actions: TrayActions): Tray {
  const image = nativeImage.createFromPath(iconPath("tray.png"));
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image);
  tray.on("click", actions.show);
  tray.setToolTip("THorizon");
  rebuildTray(actions);
  return tray;
}

export function setTrayStatus(status: string): void {
  tray?.setToolTip(`THorizon · ${status}`);
}
