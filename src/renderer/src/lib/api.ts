import type { LauncherApi } from "@shared/api";

declare global {
  interface Window {
    api?: LauncherApi;
  }
}

export const api = window.api ?? null;

export function requireApi(): LauncherApi {
  if (!api) throw new Error("E_NOT_ELECTRON");
  return api;
}

export function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/E_[A-Z_]+/);
  return match?.[0] ?? message;
}

export function errorText(error: unknown, locale: string): string {
  const code = errorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  const ru = locale === "ru";
  switch (code) {
    case "E_NOT_ELECTRON":
      return ru ? "Окно запущено без Electron." : "The window is not running inside Electron.";
    case "E_NO_CLI":
      return ru ? "CLI Horizon не найден. Установи Horizon и проверь окружение." : "Horizon CLI not found. Install Horizon and check the environment.";
    case "E_NOT_INSTALLED":
      return ru
        ? "Этот профиль ещё не установлен в Horizon."
        : "This profile is not installed in Horizon yet.";
    case "E_BUSY":
      return ru ? "Уже идёт другая операция." : "Another operation is already running.";
    case "E_CANCELED":
      return ru ? "Отменено." : "Canceled.";
    case "E_TOO_LARGE":
      return ru ? "Файл больше лимита из настроек." : "The file is larger than the import limit.";
    case "E_TYPE":
      return ru ? "Этот тип файла не поддерживается." : "That file type is not supported.";
    case "E_NOT_FOUND":
      return ru ? "Запись не найдена." : "That item was not found.";
    case "E_TIMEOUT":
      return ru ? "Команда не ответила вовремя." : "The command did not answer in time.";
    case "E_URL":
      return ru ? "Ссылка отклонена." : "The link was rejected.";
    default:
      return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
  }
}
