import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { release } from "node:os";
import { join } from "node:path";
import { app } from "electron";
import { getSettings } from "./settings";
import { log } from "./logger";
import { parseAccount, parseVersions } from "../shared/cli-parse";
import type { EnvState } from "../shared/types";

export interface CliResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  error?: "E_NO_CLI" | "E_TIMEOUT" | "E_CANCELED" | "E_SPAWN";
}

export interface RunOptions {
  env?: Record<string, string>;
  onLine?: (line: string) => void;
  onChild?: (child: ChildProcess) => void;
  timeoutMs?: number;
}

export function cliCommand(): string {
  const configured = getSettings().cliPath.trim();
  return configured || "horizon-launcher";
}

export function cliLooksInstalled(): boolean {
  const command = cliCommand();
  if (command.includes("/") || command.includes("\\")) return existsSync(command);
  return true;
}

/** Запуск официального CLI. Renderer никогда не получает доступ к spawn. */
export function runCli(args: string[], options: RunOptions = {}): Promise<CliResult> {
  const command = cliCommand();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CliResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    let child: ChildProcess;
    const script = /\.(mjs|cjs|js)$/i.test(command);
    try {
      child = spawn(script ? process.execPath : command, script ? [command, ...args] : args, {
        windowsHide: true,
        env: {
          ...process.env,
          ...(script ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
          ...options.env,
        },
      });
    } catch (error) {
      finish({ ok: false, code: null, stdout: "", stderr: String(error), error: "E_SPAWN" });
      return;
    }

    options.onChild?.(child);
    let stdout = "";
    let stderr = "";

    const timer = options.timeoutMs
      ? setTimeout(() => {
          child.kill();
          finish({ ok: false, code: null, stdout, stderr, error: "E_TIMEOUT" });
        }, options.timeoutMs)
      : null;

    child.stdout?.on("data", (buffer: Buffer) => {
      const text = buffer.toString();
      stdout += text;
      if (options.onLine) {
        text
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter(Boolean)
          .forEach(options.onLine);
      }
    });
    child.stderr?.on("data", (buffer: Buffer) => {
      stderr += buffer.toString();
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (timer) clearTimeout(timer);
      const noCli = error.code === "ENOENT";
      finish({
        ok: false,
        code: null,
        stdout,
        stderr: String(error),
        error: noCli ? "E_NO_CLI" : "E_SPAWN",
      });
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      finish({ ok: code === 0, code, stdout, stderr });
    });
  });
}

export async function checkEnv(): Promise<EnvState> {
  const settings = getSettings();
  const userData = app.getPath("userData");
  const paths = {
    userData,
    profiles: settings.profilesDir.trim() || join(userData, "profiles"),
    logs: join(userData, "logs"),
    cache: join(userData, "cache"),
  };

  const base: EnvState = {
    cli: false,
    cliPath: cliCommand(),
    cliVersion: null,
    versions: { installed: [], selected: null },
    account: { name: null, ownsJava: null },
    os: `${process.platform} ${release()}`.trim(),
    arch: process.arch,
    appVersion: app.getVersion(),
    electron: process.versions.electron ?? "",
    node: process.versions.node,
    paths,
  };

  const version = await runCli(["--version"], { timeoutMs: 12_000 });
  if (!version.ok) {
    log("warn", "cli", `not available: ${version.error ?? version.stderr}`);
    return { ...base, error: version.error ?? "E_VERSION" };
  }

  const [versions, account] = await Promise.all([
    runCli(["versions", "--installed", "--json"], { timeoutMs: 20_000 }),
    runCli(["account", "list", "--json"], { timeoutMs: 20_000 }),
  ]);

  return {
    ...base,
    cli: true,
    cliVersion: version.stdout.trim().split(/\r?\n/)[0] ?? version.stdout.trim(),
    versions: versions.ok ? parseVersions(versions.stdout) : base.versions,
    account: account.ok ? parseAccount(account.stdout) : base.account,
  };
}
