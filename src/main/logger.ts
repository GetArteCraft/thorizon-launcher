import { app } from "electron";
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import type { LogLevel } from "../shared/types";

const RANK: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

let minLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function logFile(): string {
  return join(app.getPath("userData"), "logs", "launcher.log");
}

function rotate(file: string): void {
  try {
    if (existsSync(file) && statSync(file).size > 2 * 1024 * 1024) {
      renameSync(file, `${file}.1`);
    }
  } catch {
    // ротация не должна ронять приложение
  }
}

export function log(level: LogLevel, scope: string, message: string): void {
  if (RANK[level] > RANK[minLevel]) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${scope}: ${message}`;
  try {
    const file = logFile();
    mkdirSync(join(file, ".."), { recursive: true });
    rotate(file);
    appendFileSync(file, `${line}\n`, "utf8");
  } catch {
    // лог — не критичный путь
  }
  if (level === "error") console.error(line);
}

export function readLog(limit = 400): string {
  try {
    const text = readFileSync(logFile(), "utf8");
    return text.split(/\r?\n/).filter(Boolean).slice(-limit).join("\n");
  } catch {
    return "";
  }
}

/** Убираем из текста всё, что похоже на токен или ключ, перед отчётом. */
export function redact(text: string): string {
  return text
    .replace(/(token|secret|password|authorization|bearer)[=:\s]+[^\s"']+/gi, "$1: [redacted]")
    .replace(/gh[opsu]_[A-Za-z0-9]{20,}/g, "[redacted]")
    .replace(/eyJ[A-Za-z0-9._-]{30,}/g, "[redacted]");
}
