#!/usr/bin/env node
/**
 * Тестовый двойник официального horizon-launcher.
 * Не игра и не эмуляция: только те же команды, JSON и коды возврата, чтобы
 * прогнать IPC лаунчера без аккаунта и установленной игры.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = process.argv.slice(2);
const statePath = process.env.THORIZON_MOCK_STATE || join(process.cwd(), "mock-state.json");

function readState() {
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return { profiles: {}, plays: 0, builds: 0 };
  }
}

function writeState(state) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function out(line) {
  process.stdout.write(`${line}\n`);
}

const command = args[0];

if (command === "--version" || command === "version") {
  out("horizon-launcher 26.3.0-mock");
  process.exit(0);
}

if (command === "versions") {
  out(JSON.stringify({ versions: [{ version: "26.3", installed: true }] }));
  process.exit(0);
}

if (command === "account") {
  if (args[1] === "sign-in") {
    out("Signed in as TestPlayer");
    process.exit(0);
  }
  out(JSON.stringify({ accounts: [{ name: "TestPlayer", owns_java: true }] }));
  process.exit(0);
}

if (command === "mods" && args[1] === "install") {
  const instanceIndex = args.indexOf("--instance");
  const id = instanceIndex > 0 ? args[instanceIndex - 1] : args.at(-1);
  const state = readState();
  const instance = instanceIndex >= 0 ? args[instanceIndex + 1] : null;
  const steps = ["resolving the manifest", "downloading mods", "verifying SHA-256", "writing profile"];
  for (let index = 0; index < steps.length; index += 1) {
    out(`[${index + 1}/${steps.length}] ${steps[index]}`);
    await sleep(220);
  }
  if (instance) {
    state.lastMod = { id, instance };
    writeState(state);
    out(`Installed ${id} into ${instance}`);
    process.exit(0);
  }
  state.profiles[id] = {
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    version: "1.0.0",
    game: "26.3",
    mods: 39,
    created: new Date().toISOString(),
  };
  state.lastIndex = process.env.HORIZON_MOD_INDEX ?? null;
  writeState(state);
  const userData = process.env.THORIZON_USER_DATA;
  if (userData) {
    const saves = join(userData, "horizon-packs", id, "home", "saves", "MockWorld");
    mkdirSync(saves, { recursive: true });
    writeFileSync(join(saves, "level.dat"), "mock world");
  }
  out(`Installed ${id}`);
  process.exit(0);
}

if (command === "modpack" && args[1] === "list") {
  const state = readState();
  out(JSON.stringify(Object.values(state.profiles)));
  process.exit(0);
}

if (command === "modpack" && args[1] === "play") {
  const id = args[2];
  const state = readState();
  state.plays = (state.plays ?? 0) + 1;
  writeState(state);
  out(`Launching ${id} with account TestPlayer`);
  await sleep(300);
  process.exit(0);
}

if (command === "native-build") {
  const instance = args[args.indexOf("--instance") + 1] || "unknown";
  const state = readState();
  const lines = [
    `native-build ${instance}: preparing toolchain`,
    "  cargo 1.99.1 · target x86_64-pc-windows-msvc",
    "  compiling 39 native mods",
    "  left_out: none",
    "  Up to date",
  ];
  for (const line of lines) {
    out(line);
    await sleep(200);
  }
  state.builds = (state.builds ?? 0) + 1;
  writeState(state);
  process.exit(0);
}

if (command === "logs") {
  out("[12:00:00] [INFO] mock game log: world loaded");
  out("[12:00:01] [INFO] 39 mods enabled");
  out("[12:00:02] [INFO] ready");
  process.exit(0);
}

if (command === "server") {
  const dir = args[args.indexOf("--dir") + 1] || "";
  const state = readState();
  state.serverStarts = (state.serverStarts ?? 0) + 1;
  writeState(state);
  out(`Starting mock server in ${dir}`);
  out("Done (1.2s)! For help, type help");
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    out(`[mock] ${String(chunk).trim()}`);
  });
  await sleep(2000);
  out("Stopping server");
  process.exit(0);
}

out(`mock: unknown command ${args.join(" ")}`);
process.exit(2);
