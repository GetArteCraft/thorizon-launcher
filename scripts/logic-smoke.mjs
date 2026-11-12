import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron } from "playwright-core";
import JSZip from "jszip";

const root = process.cwd();
const fixture = join(root, "tests", "fixtures", "horizon-launcher.mjs");
if (!existsSync(fixture)) {
  console.error("mock CLI is missing");
  process.exit(1);
}

const userData = mkdtempSync(join(tmpdir(), "thorizon-logic-"));
const mockState = join(userData, "mock-state.json");
writeFileSync(
  join(userData, "settings.json"),
  JSON.stringify({
    schema: 1,
    language: "en",
    dismissedOnboarding: true,
    closeToTray: false,
    upnp: false,
    cliPath: fixture,
  }),
);

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` вЂ” ${detail}` : ""}`);
}

const app = await electron.launch({
  args: ["."],
  cwd: root,
  env: {
    ...process.env,
    THORIZON_USER_DATA: userData,
    THORIZON_MOCK_STATE: mockState,
    ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
  },
});

try {
  const page = await app.firstWindow();
  page.on("pageerror", (error) => console.log("pageerror:", String(error)));
  page.on("console", (message) => { if (message.type() === "error") console.log("console:", message.text()); });
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setSize(1440, 900);
  });

  await page.waitForSelector(".home-hero", { timeout: 40_000 });
  await page.waitForTimeout(900);
  const envText = await page.locator(".env-card").innerText();
  check("CLI detected", envText.includes("26.3.0-mock"), envText.replace(/\n/g, " / "));
  check("account parsed", envText.includes("TestPlayer"), envText.replace(/\n/g, " / "));

  await page.locator('[data-tab="packs"]').click();
  await page.waitForSelector(".pack-card");
  const better = page.locator(".pack-card", { hasText: "Better+" }).first();
  await better.getByRole("button", { name: "Install", exact: true }).click();
  await page.waitForSelector(".install-card", { timeout: 20_000 });
  await page.waitForSelector(".install-card--done", { timeout: 40_000 });
  check("pack install reports done", true);

  await page.locator('[data-tab="instances"]').click();
  await page.waitForSelector(".instance-card", { timeout: 15_000 });
  const instances = await page.locator(".instance-card").first().innerText();
  check("CLI profile listed", instances.toLowerCase().includes("better"), instances.split("\n")[0]);

  const stateAfterInstall = JSON.parse(readFileSync(mockState, "utf8"));
  check("local index passed to CLI", Boolean(stateAfterInstall.lastIndex) && existsSync(stateAfterInstall.lastIndex), stateAfterInstall.lastIndex);
  check("mock state has profile", Boolean(stateAfterInstall.profiles?.better_plus));

  await page.locator(".instance-card").first().getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForSelector('.toast--success:has-text("Game started")', { timeout: 20_000 });
  check("play completes", true);

  await page.locator(".instance-card").first().getByRole("button", { name: "Build native", exact: true }).click();
  await page.waitForSelector(".build-state", { timeout: 15_000 });
  await page.waitForTimeout(1800);
  const buildText = await page.locator(".build-state").innerText();
  check("native build finished", buildText.toLowerCase().includes("finished"), buildText.replace(/\n/g, " / "));
  const buildLog = await page.locator(".console").innerText();
  check("native build log", buildLog.includes("left_out: none"), buildLog.split("\n").slice(-2).join(" / "));
  await page.locator(".modal__foot").getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(root, "out", "shots", "16-after-build.png") });

  const backupRoot = join(userData, "horizon-packs", "better_plus", "backups");
  check("auto backup before play", existsSync(backupRoot) && readdirSync(backupRoot).length > 0, backupRoot);
  const optionsFile = join(userData, "horizon-packs", "better_plus", "home", "options.txt");
  check(
    "launch options written to options.txt",
    existsSync(optionsFile) && readFileSync(optionsFile, "utf8").includes("overrideWidth:1280"),
    existsSync(optionsFile) ? readFileSync(optionsFile, "utf8").replace(/\n/g, " / ") : "missing",
  );

  await page.locator('[data-tab="mods"]').click();
  await page.waitForSelector(".project-card");
  await page.locator(".project-card").first().click();
  await page.waitForSelector(".drawer-install");
  await page.locator(".drawer-install").getByRole("button", { name: "Install", exact: true }).click();
  await page.waitForSelector('.toast--success:has-text("Installed")', { timeout: 20_000 });
  const stateAfterMod = JSON.parse(readFileSync(mockState, "utf8"));
  check("single mod installs into profile", stateAfterMod.lastMod?.instance === "better_plus", JSON.stringify(stateAfterMod.lastMod));
  await page.locator(".drawer__close").click();

  await page.locator('[data-tab="instances"]').click();
  await page.waitForSelector(".instance-card");
  const backupsBefore = readdirSync(backupRoot).length;
  await page.locator(".instance-card").first().getByRole("button", { name: "Back up now", exact: true }).click();
  await page.waitForTimeout(900);
  check("manual backup created", readdirSync(backupRoot).length > backupsBefore, `${backupsBefore} -> ${readdirSync(backupRoot).length}`);

  const modFile = join(userData, "TestMod.hmod");
  writeFileSync(modFile, "mock mod bytes");
  const imported = await page.evaluate(async (path) => window.api.localImport("better_plus", [path]), modFile);
  check("library import returns a file", imported.length === 1, imported.join(", "));
  const localFiles = await page.evaluate(() => window.api.localList("better_plus"));
  const importedFile = localFiles.find((file) => file.name === "TestMod.hmod");
  check("library lists the imported file with a hash", Boolean(importedFile) && importedFile.sha256.length === 64, importedFile?.sha256?.slice(0, 12));
  await page.locator('[data-tab="library"]').click();
  await page.waitForTimeout(500);
  check("library table renders the file", (await page.locator(".file-row").count()) >= 1, String(await page.locator(".file-row").count()));
  const disabled = await page.evaluate(() => window.api.localToggle("better_plus", "TestMod.hmod", false));
  check("library toggle renames to .disabled", disabled.endsWith(".disabled"), disabled);

  const packPath = join(userData, "logic-pack.hpack");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, packPath);
  await page.locator('[data-tab="editor"]').click();
  await page.waitForSelector(".picker-row");
  await page.locator(".picker-row").first().click();
  await page.locator(".editor-main input").first().fill("Logic Pack");
  await page.getByRole("button", { name: "Export .hpack", exact: true }).click();
  await page.waitForSelector('.toast--success:has-text("Saved to")', { timeout: 20_000 });
  check("editor exports a file", existsSync(packPath), packPath);
  const zip = await JSZip.loadAsync(readFileSync(packPath));
  const toml = await zip.file("horizon-modpack.toml")?.async("string");
  check(
    "exported .hpack has a valid TOML manifest",
    Boolean(toml && toml.includes("format = 1") && toml.includes('id = "logic_pack"') && toml.includes("[[mods]]")),
    toml?.split("\n").slice(0, 4).join(" / "),
  );

  await page.locator('[data-tab="diagnostics"]').click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(root, "out", "shots", "17-after-diag.png") });
  console.log("main after diag:", (await page.locator(".main").innerText()).slice(0, 300));
  await page.waitForSelector(".diag-stats", { timeout: 15_000 });
  await page.getByRole("button", { name: "Game", exact: true }).click();
  await page.waitForTimeout(900);
  const gameLog = await page.locator(".console--tall").innerText();
  check("game log from CLI", gameLog.includes("mock game log"), gameLog.split("\n")[0]);

  await page.locator('[data-tab="servers"]').click();
  await page.getByRole("button", { name: "Add server", exact: true }).first().click();
  await page.waitForSelector(".modal");
  await page.getByLabel("Name", { exact: true }).fill("Local test");
  await page.getByLabel("Address", { exact: true }).fill("127.0.0.1");
  await page.getByLabel("Port", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForSelector(".server-card");
  check("server added", (await page.locator(".server-card").innerText()).includes("Local test"));
  await page.locator(".server-card").getByRole("button", { name: "Check", exact: true }).click();
  await page.waitForTimeout(1200);
  check("TCP check reaches offline verdict", (await page.locator(".server-card").innerText()).toLowerCase().includes("offline"), await page.locator(".server-card").innerText());

  await page.locator(".server-card").getByRole("button", { name: "Start server", exact: true }).click();
  await page.waitForTimeout(700);
  const consoleText = await page.locator(".console").innerText();
  check("server console streams", consoleText.includes("mock server"), consoleText.split("\n")[0]);
  const serverDir = join(userData, "servers", "127.0.0.1_1");
  const properties = existsSync(join(serverDir, "server.properties"))
    ? readFileSync(join(serverDir, "server.properties"), "utf8")
    : "";
  check("server.properties written", properties.includes("white-list=true") && properties.includes("server-port=1"), properties.replace(/\n/g, " / "));

  const commandInput = page.locator(".console-input input");
  if (await commandInput.count()) {
    await commandInput.fill("whitelist add TestPlayer");
    await commandInput.press("Enter");
    await page.waitForTimeout(500);
    check("server console accepts a command", (await page.locator(".console").innerText()).includes("[mock] whitelist add TestPlayer"));
  } else {
    check("server console accepts a command", false, "console input is hidden");
  }

  await page.locator('[data-tab="diagnostics"]').click();
  await page.waitForSelector(".diag-side");
  const side = await page.locator(".diag-side").innerText();
  check("local stats counted", side.includes("Packs installed") && !side.includes("Packs installed\n0"), side.replace(/\n/g, " / ").slice(0, 220));

  await page.screenshot({ path: join(root, "out", "shots", "15-logic.png") });
} finally {
  await app.close();
}

/* ---------------------------------------------------------------- startup settings */

const settingsPath = join(userData, "settings.json");
const bootSettings = JSON.parse(readFileSync(settingsPath, "utf8"));
writeFileSync(
  settingsPath,
  JSON.stringify({
    ...bootSettings,
    launchGameOnStart: true,
    autostartServer: true,
    defaultProfile: "better_plus",
    hideLauncherOnPlay: false,
  }),
);
const beforeBoot = JSON.parse(readFileSync(mockState, "utf8"));
const app2 = await electron.launch({
  args: ["."],
  cwd: root,
  env: { ...process.env, THORIZON_USER_DATA: userData, THORIZON_MOCK_STATE: mockState, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
});
try {
  await app2.firstWindow();
  await new Promise((resolve) => setTimeout(resolve, 4000));
} finally {
  await app2.close();
}
const afterBoot = JSON.parse(readFileSync(mockState, "utf8"));
check("launchGameOnStart plays the default profile", afterBoot.plays > beforeBoot.plays, `${beforeBoot.plays} -> ${afterBoot.plays}`);
check("autostartServer starts the last server", afterBoot.serverStarts > (beforeBoot.serverStarts ?? 0), `${beforeBoot.serverStarts ?? 0} -> ${afterBoot.serverStarts}`);

const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} logic checks passed`);
if (failed.length > 0) process.exitCode = 1;




