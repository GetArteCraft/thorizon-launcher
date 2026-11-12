import { app } from "electron";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createConnection } from "node:net";
import type { ChildProcess } from "node:child_process";
import type { WebContents } from "electron";
import { runCli } from "./cli";
import { getSettings } from "./settings";
import { log } from "./logger";
import { mapPort, unmapPort } from "./upnp";
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
  port: number;
  upnp: boolean;
}

let running: RunningServer | null = null;

export function serverIsRunning(): string | null {
  return running?.id ?? null;
}

async function backupServer(dir: string, keep: number): Promise<void> {
  const world = join(dir, "world");
  if (!existsSync(world)) return;
  const backups = join(dir, "backups");
  const target = join(backups, new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19));
  await mkdir(target, { recursive: true });
  await cp(world, join(target, "world"), { recursive: true, force: true });
  const entries = await readdir(backups, { withFileTypes: true }).catch(() => []);
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const name of dirs.slice(0, Math.max(0, dirs.length - keep))) {
    await rm(join(backups, name), { recursive: true, force: true }).catch(() => undefined);
  }
  log("info", "servers", `backup ${target}`);
}

export async function startServer(id: string, sender?: WebContents): Promise<void> {
  if (running) throw new Error("E_BUSY");
  const servers = await readServers();
  const server = servers.find((item) => item.id === id);
  if (!server) throw new Error("E_NOT_FOUND");
  const settings = getSettings();

  const dir = join(app.getPath("userData"), "servers", id.replace(/[^a-z0-9._-]+/gi, "_"));
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "server.properties"),
    [
      `server-port=${server.port || settings.portFrom}`,
      `white-list=${settings.whitelist}`,
      "online-mode=true",
      `motd=THorizon ${server.name}`,
      "",
    ].join("\n"),
    "utf8",
  );
  if (settings.autoBackup) await backupServer(dir, settings.backupsToKeep);

  running = { id, child: null, port: server.port || settings.portFrom, upnp: settings.upnp };

  const send = (line: string) => {
    if (sender && !sender.isDestroyed()) sender.send("server:line", { id, line });
    else log("info", "servers", line);
  };
  send(`Starting server for ${server.name} on ${server.host}:${server.port}`);

  if (settings.upnp) {
    send("UPnP: asking the router for a TCP mapping…");
    const mapping = await mapPort(server.port || settings.portFrom, `THorizon ${server.name}`);
    send(
      mapping.ok
        ? `UPnP: ${mapping.message}${mapping.externalIp ? ` (external ${mapping.externalIp})` : ""}`
        : `UPnP: ${mapping.message}. Forward TCP ${server.port || settings.portFrom} manually, or use Radmin VPN / Tailscale.`,
    );
  }

  const result = await runCli(["server", "--dir", dir, "--accept-eula"], {
    onChild: (child) => {
      if (running) running.child = child;
    },
    onLine: send,
  });
  const mappedPort = running?.port;
  const usedUpnp = running?.upnp;
  running = null;
  if (usedUpnp && mappedPort) void unmapPort(mappedPort);
  send(result.ok ? "Server stopped" : `Server failed: ${result.stderr.trim() || result.error}`);
}

export function stopServer(): boolean {
  if (!running) return false;
  const { child, port, upnp } = running;
  child?.kill();
  running = null;
  if (upnp) void unmapPort(port);
  return true;
}

export function serverCommand(command: string): boolean {
  if (!running?.child?.stdin) return false;
  running.child.stdin.write(`${command.replace(/[\r\n]+/g, " ")}\n`);
  return true;
}
