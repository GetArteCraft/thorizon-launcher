import { app } from "electron";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Settings } from "../shared/types";

/** Автозапуск средствами ОС. `--autostart` отличает старт от логина от ручного. */
export function applyAutostart(settings: Settings): void {
  app.setLoginItemSettings({
    openAtLogin: settings.autostart,
    args: settings.autostartMinimized ? ["--autostart", "--minimized"] : ["--autostart"],
  });
}

function exec(command: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true, timeout: 4000 }, (error, stdout) => {
      resolve(error ? "" : stdout);
    });
  });
}

/** Ноутбук на батарее? Нужно только для опции «не автозапускать от батареи». */
export async function isOnBattery(): Promise<boolean> {
  if (process.platform === "linux") {
    try {
      const root = "/sys/class/power_supply";
      const entries = await readdir(root);
      for (const entry of entries) {
        try {
          const status = await readFile(join(root, entry, "status"), "utf8");
          if (status.trim().toLowerCase() === "discharging") return true;
        } catch {
          // не батарея
        }
      }
    } catch {
      // нет sysfs — считаем, что питание от сети
    }
    return false;
  }

  if (process.platform === "win32") {
    const output = await exec("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "(Get-CimInstance Win32_Battery).BatteryStatus",
    ]);
    // 2 = на батарее; пустой вывод = нет батареи/десктоп
    return output.trim().split(/\r?\n/).includes("2");
  }

  return false;
}
