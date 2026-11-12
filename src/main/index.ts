/**
 * Главный процесс: одно окно, трей, мосты к официальному CLI Horizon.
 * Renderer не имеет доступа к Node — только window.api (см. src/preload/index.ts).
 */
import { app, BrowserWindow, Menu, Notification, shell } from "electron";
import { join } from "node:path";
import { loadSettings, getSettings, saveSettings } from "./settings";
import { registerIpc } from "./ipc";
import { checkEnv } from "./cli";
import { createTray, iconPath, rebuildTray, setTrayStatus, type TrayActions } from "./tray";
import { applyAutostart, isOnBattery } from "./autostart";
import { onUpdateState, startUpdateLoop } from "./updater";
import { listServers, startServer } from "./servers";
import { listProfiles, playProfile } from "./profiles";
import { log, setLogLevel } from "./logger";

if (process.env.THORIZON_USER_DATA) {
  app.setPath("userData", process.env.THORIZON_USER_DATA);
}

const settings = loadSettings();
if (!settings.hardwareAcceleration) app.disableHardwareAcceleration();
let win: BrowserWindow | null = null;
let isQuitting = false;
let boundsTimer: NodeJS.Timeout | null = null;

const singleInstance = settings.singleInstance ? app.requestSingleInstanceLock() : true;
if (!singleInstance) {
  app.quit();
}

function rememberBounds(): void {
  const current = win;
  if (!current || !getSettings().rememberWindow) return;
  if (boundsTimer) clearTimeout(boundsTimer);
  boundsTimer = setTimeout(() => {
    if (!current || current.isDestroyed() || current.isMaximized() || current.isMinimized()) return;
    const [width = 0, height = 0] = current.getSize();
    const [x = 0, y = 0] = current.getPosition();
    saveSettings({ window: { width, height, x, y, maximized: false } });
  }, 400);
}

function createWindow(): void {
  const stored = getSettings().window;
  win = new BrowserWindow({
    width: stored.width,
    height: stored.height,
    x: stored.x,
    y: stored.y,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: "#080b10",
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    icon: iconPath("icon.png"),    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  win.once("ready-to-show", () => {
    if (!getSettings().startMinimized && !process.argv.includes("--minimized")) win?.show();
    if (stored.maximized) win?.maximize();
  });

  win.on("close", (event) => {
    if (getSettings().closeToTray && !isQuitting) {
      event.preventDefault();
      win?.hide();
      if (getSettings().trayNotifications) {
        new Notification({ title: "THorizon", body: "Still running in the tray." }).show();
      }
    }
  });

  win.on("minimize", () => {
    if (getSettings().minimizeToTray) win?.hide();
  });

  win.on("maximize", () => win?.webContents.send("window:state", true));
  win.on("unmaximize", () => win?.webContents.send("window:state", false));
  win.on("move", rememberBounds);
  win.on("resize", rememberBounds);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https:|mailto:)/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("before-input-event", (_event, input) => {
    if (input.key === "F12" && !app.isPackaged) void win?.webContents.toggleDevTools();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.on("closed", () => {
    win = null;
  });
}

function showWindow(): void {
  if (!win) {
    createWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function trayActions(): TrayActions {
  return {
    show: showWindow,
    play: () => {
      showWindow();
      win?.webContents.send("navigate", "instances");
    },
    settings: () => {
      showWindow();
      win?.webContents.send("navigate", "settings");
    },
    diagnostics: () => {
      showWindow();
      win?.webContents.send("navigate", "diagnostics");
    },
    quit: () => {
      isQuitting = true;
      app.quit();
    },
  };
}

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("second-instance", () => {
  showWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !getSettings().closeToTray) app.quit();
});

app.on("activate", () => {
  if (!win) createWindow();
  else showWindow();
});

if (singleInstance) {
  void app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    setLogLevel(getSettings().logLevel);
    applyAutostart(getSettings());

    if (
      process.argv.includes("--autostart") &&
      getSettings().autostartOnBattery &&
      (await isOnBattery())
    ) {
      app.quit();
      return;
    }

    createWindow();
    createTray(trayActions());

    registerIpc({
      getWindow: () => win,
      showWindow,
      onSettingsChanged: () => {
        rebuildTray(trayActions());
      },
    });

    onUpdateState((state) => {
      win?.webContents.send("update:state", state);
      if (state.status === "ready") {
        setTrayStatus(`update ${state.version ?? ""} ready`);
        if (getSettings().trayNotifications) {
          new Notification({ title: "THorizon", body: `Update ${state.version ?? ""} is ready to install.` }).show();
        }
      }
    });

    if (process.argv.includes("--minimized")) saveSettings({ startMinimized: true });

    const stopUpdates = startUpdateLoop();
    app.on("before-quit", stopUpdates);

    const env = await checkEnv();
    if (env.cli) {
      log("info", "app", `CLI ${env.cliVersion ?? "unknown"} at ${env.cliPath}`);
    } else {
      log("warn", "app", "CLI not found; catalog works, installs and play are disabled");
    }

    if (env.cli) {
      const boot = getSettings();
      if (boot.autostartServer) {
        const servers = await listServers();
        const last = servers[0];
        if (last) {
          log("info", "app", `autostart server ${last.id}`);
          void startServer(last.id);
        }
      }
      if (boot.launchGameOnStart) {
        const profiles = await listProfiles();
        const profile =
          profiles.find((item) => item.id === boot.defaultProfile) ??
          profiles.find((item) => item.source === "cli");
        if (profile) {
          log("info", "app", `launchGameOnStart ${profile.id}`);
          if (boot.hideLauncherOnPlay) win?.hide();
          void playProfile(profile.id)
            .catch((error) => log("warn", "app", `startup play: ${String(error)}`))
            .finally(() => {
              if (boot.hideLauncherOnPlay) showWindow();
            });
        }
      }
    }
  });
}
