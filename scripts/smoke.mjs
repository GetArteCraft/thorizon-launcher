import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron } from "playwright-core";

const root = process.cwd();
const shots = join(root, "out", "shots");
mkdirSync(shots, { recursive: true });

const userData = mkdtempSync(join(tmpdir(), "thorizon-smoke-"));
writeFileSync(
  join(userData, "settings.json"),
  JSON.stringify({
    schema: 1,
    dismissedOnboarding: true,
    theme: "dark",
    language: "en",
    closeToTray: false,
  }),
);

const errors = [];
const checks = [];

function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` вЂ” ${detail}` : ""}`);
}

const app = await electron.launch({
  args: ["."],
  cwd: root,
  env: {
    ...process.env,
    THORIZON_USER_DATA: userData,
    ELECTRON_DISABLE_SECURITY_WARNINGS: "true",
  },
});

try {
  const page = await app.firstWindow();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));

  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win?.setSize(1440, 900);
    win?.center();
  });

  await page.waitForSelector(".home-hero", { timeout: 40_000 });
  await page.waitForTimeout(1200);

  check("home renders", await page.locator(".home-hero").isVisible());
  check("hero headline", (await page.locator(".hero-title").innerText()).includes("registry"));
  check("nav has 11 items", (await page.locator(".nav-item").count()) === 11, String(await page.locator(".nav-item").count()));
  check("env card present", await page.locator(".env-card").isVisible());
  check("scene canvas or fallback", (await page.locator(".scene-canvas, .scene-fallback").count()) > 0);

  await page.screenshot({ path: join(shots, "01-home-dark.png") });

  await page.locator('[data-tab="packs"]').click();
  await page.waitForSelector(".pack-card");
  await page.waitForTimeout(500);
  const cards = await page.locator(".pack-card").count();
  check("20 pack cards", cards === 20, String(cards));
  await page.screenshot({ path: join(shots, "02-packs.png") });

  await page.locator(".pack-card").first().click();
  await page.waitForSelector(".detail-hero");
  check("pack detail opens", (await page.locator(".detail-hero h1").innerText()).includes("Better"));
  check("mod table has rows", (await page.locator(".mod-table__row").count()) > 10, String(await page.locator(".mod-table__row").count()));
  await page.screenshot({ path: join(shots, "03-pack-detail.png") });
  await page.locator(".back-link").click();

  await page.locator('[data-tab="mods"]').click();
  await page.waitForSelector(".project-card");
  await page.waitForTimeout(400);
  const projects = await page.locator(".project-card").count();
  check("mods grid", projects > 100, String(projects));
  await page.screenshot({ path: join(shots, "04-mods.png") });
  await page.locator(".project-card").first().click();
  await page.waitForSelector(".drawer");
  check("mod drawer opens", await page.locator(".drawer").isVisible());
  await page.screenshot({ path: join(shots, "05-mod-drawer.png") });
  await page.locator(".drawer__close").click();

  await page.locator('[data-tab="shaders"]').click();
  await page.waitForSelector(".project-card");
  await page.waitForTimeout(350);
  check("shaders grid", (await page.locator(".project-card").count()) === 12, String(await page.locator(".project-card").count()));
  await page.screenshot({ path: join(shots, "04-shaders.png") });
  await page.locator(".project-card").first().click();
  await page.waitForSelector(".drawer-install");
  check("shader install explains profiles", (await page.locator(".drawer-install").innerText()).includes("profile"));
  await page.locator(".drawer__close").click();

  await page.locator('[data-tab="servers"]').click();
  await page.waitForTimeout(300);
  check("servers empty state", await page.locator(".empty").isVisible());
  await page.screenshot({ path: join(shots, "06-servers.png") });

  await page.locator('[data-tab="library"]').click();
  await page.waitForTimeout(300);
  check("library renders", (await page.locator(".dropzone, .empty").count()) > 0);
  await page.screenshot({ path: join(shots, "07-library.png") });

  await page.locator('[data-tab="editor"]').click();
  await page.waitForSelector(".editor-grid");
  await page.waitForTimeout(450);
  check("editor renders", (await page.locator(".picker-row").count()) > 10, String(await page.locator(".picker-row").count()));
  await page.screenshot({ path: join(shots, "08-editor.png") });

  await page.locator('[data-tab="settings"]').click();
  await page.waitForSelector(".settings-layout");
  await page.waitForTimeout(450);
  check("settings sections", (await page.locator(".settings-nav__item").count()) === 10, String(await page.locator(".settings-nav__item").count()));
  await page.screenshot({ path: join(shots, "09-settings.png") });

  await page.getByRole("button", { name: /Overworld/ }).click();
  await page.waitForTimeout(500);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  check("light theme applies", theme === "light", theme);
  await page.screenshot({ path: join(shots, "10-settings-light.png") });

  await page.locator('[data-tab="home"]').click();
  await page.waitForSelector(".home-hero");
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(shots, "11-home-light.png") });

  await page.locator('[data-tab="diagnostics"]').click();
  await page.waitForSelector(".diag-stats");
  await page.waitForTimeout(450);
  check("diagnostics renders", await page.locator(".diag-stats").isVisible());
  check("local stats panel", (await page.locator(".diag-side").innerText()).toLowerCase().includes("local stats"));
  await page.screenshot({ path: join(shots, "12-diagnostics.png") });

  const significant = errors.filter(
    (text) => !/Download the React DevTools|Electron Security Warning/i.test(text),
  );
  check("no renderer errors", significant.length === 0, significant.slice(0, 3).join(" | "));
} finally {
  await app.close();
}

/* ---------------------------------------------------------------- onboarding + ru */

const freshData = mkdtempSync(join(tmpdir(), "thorizon-fresh-"));
writeFileSync(join(freshData, "settings.json"), JSON.stringify({ schema: 1, language: "en" }));
const app2 = await electron.launch({
  args: ["."],
  cwd: root,
  env: { ...process.env, THORIZON_USER_DATA: freshData, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
});

try {
  const page = await app2.firstWindow();
  await app2.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win?.setSize(1440, 900);
    win?.center();
  });
  await page.waitForSelector(".onboarding", { timeout: 40_000 });
  check("onboarding shows on first run", await page.locator(".onboarding").isVisible());
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(shots, "13-onboarding.png") });

  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForTimeout(350);
  check("onboarding step 2", (await page.locator(".onboarding__panel").innerText()).includes("Horizon"));
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Open the launcher", exact: true }).click();
  await page.waitForSelector(".home-hero");
  check("onboarding completes", (await page.locator(".onboarding").count()) === 0);

  await page.locator(".sidebar select").selectOption("ru");
  await page.waitForTimeout(500);
  const ruNav = await page.locator(".nav-item").allInnerTexts();
  check("russian interface", ruNav.some((text) => text.includes("Сборки")), ruNav.slice(0, 3).join(" / "));
  check("html lang is ru", (await page.evaluate(() => document.documentElement.lang)) === "ru");
  await page.locator('[data-tab="home"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(shots, "14-home-ru.png") });
} finally {
  await app2.close();
}

const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
if (failed.length > 0) process.exitCode = 1;








