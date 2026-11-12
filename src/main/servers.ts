import { app } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "node:net";
import type { ChildProcess } from "node:child_process";
import type { WebContents } from "electron";
import { runCli } from "./cli";
import { getSettings } from "./settings";
import { log } from "./logger";
import type { AddServerInput, ServerEntry, ServerPing } from "../shared/types";

function serversFile(): string {
  return join(app.getPath("userData"), "servers.json");
}

async function readServers(): Promise<ServerEntry[]> {
  try {
    const parsed = JSON.parse(await readFile(serversFile(), "utf8")) as unknown;
    return Array.isArray(parsed) ? (parsed as ServerEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeServers(servers: ServerEntry[]): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(serversFile(), `${JSON.stringify(servers, null, 2)}\n`, "utf8");
}

export async function listServers(): Promise<ServerEntry[]> {
  return readServers();
}

export async function addServer(input: AddServerInput): Promise<ServerEntry> {
  const name = input.name.trim().slice(0, 60);
  const host = input.host.trim().slice(0, 200);
  if (!name || !host) throw new Error("E_INVALID");
  const port = Math.min(65535, Math.max(1, Math.round(input.port || 25565)));
  const servers = await readServers();
  const entry: ServerEntry = {
    id: `${host}:${port}`.toLowerCase().replace(/[^a-z0-9:._-]+/g, "-"),
    name,
    host,
    port,
    packId: input.packId ?? null,
    version: input.version?.trim() || "26.3",
    whitelist: input.whitelist ?? true,
    addedAt: new Date().toISOString(),
    ping: null,
  };
  const next = [entry, ...servers.filter((server) => server.id !== entry.id)];
  await writeServers(next);
  log("info", "servers", `added ${entry.id}`);
  return entry;
}

export async function removeServer(id: string): Promise<void> {
  const servers = await readServers();
  await writeServers(servers.filter((server) => server.id !== id));
}

export function pingServer(host: string, port: number, timeoutMs = 2500): Promise<ServerPing> {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = createConnection({ host, port });
    let done = false;
    const finish = (ping: ServerPing) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ping);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () =>
      finish({ online: true, latencyMs: Date.now() - started, checkedAt: new Date().toISOString() }),
    );
    socket.once("timeout", () =>
      finish({
        online: false,
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        message: "Connection timed out",
      }),
    );
    socket.once("error", (error: NodeJS.ErrnoException) =>
      finish({
        online: false,
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        message: error.code ?? "Connection failed",
      }),
    );
  });
}

export async function pingAndStore(id: string): Promise<ServerEntry | null> {
  const servers = await readServers();
  const server = servers.find((item) => item.id === id);
  if (!server) return null;
  const ping = await pingServer(server.host, server.port);
  server.ping = ping;
  await writeServers(servers);
  return server;
}

interface RunningServer {
  id: string;
  child: ChildProcess | null;
}

let running: RunningServer | null = null;

export function serverIsRunning(): string | null {
  return running?.id ?? null;
}

export async function startServer(id: string, sender: WebContents): Promise<void> {
  if (running) throw new Error("E_BUSY");
  const servers = await readServers();
  const server = servers.find((item) => item.id === id);
  if (!server) throw new Error("E_NOT_FOUND");
  if (!getSettings().serverConsole) {
    // консоль просто не показываем, сервер всё равно работает
  }

  const dir = join(app.getPath("userData"), "servers", id.replace(/[^a-z0-9._-]+/gi, "_"));
  await mkdir(dir, { recursive: true });
  running = { id, child: null };

  const send = (line: string) => {
    if (!sender.isDestroyed()) sender.send("server:line", { id, line });
  };
  send(`Starting server for ${server.name} on ${server.host}:${server.port}`);

  const result = await runCli(["server", "--dir", dir, "--accept-eula"], {
    onChild: (child) => {
      if (running) running.child = child;
    },
    onLine: send,
  });
  running = null;
  send(result.ok ? "Server stopped" : `Server failed: ${result.stderr.trim() || result.error}`);
}

export function stopServer(): boolean {
  if (!running) return false;
  running.child?.kill();
  running = null;
  return true;
}
