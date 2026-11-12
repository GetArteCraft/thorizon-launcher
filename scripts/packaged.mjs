import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron } from "playwright-core";

const executable = join(process.cwd(), "release", "win-unpacked", "THorizon.exe");
if (!existsSync(executable)) {
  console.error(`Build the installer first: ${executable} is missing`);
  process.exit(1);
}

const userData = mkdtempSync(join(tmpdir(), "thorizon-packaged-"));
writeFileSync(join(userData, "settings.json"), JSON.stringify({ schema: 1, language: "en" }));

const app = await electron.launch({
  executablePath: executable,
  env: { ...process.env, THORIZON_USER_DATA: userData, ELECTRON_DISABLE_SECURITY_WARNINGS: "true" },
});

try {
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.setSize(1440, 900);
  });
  await page.waitForSelector(".onboarding", { timeout: 40_000 });

  const packaged = await app.evaluate(({ app: electronApp }) => ({
    packaged: electronApp.isPackaged,
    resources: process.resourcesPath,
    userData: electronApp.getPath("userData"),
  }));
  const catalogDir = join(process.cwd(), "release", "win-unpacked", "resources", "resources", "catalog");
  const catalog = {
    index: existsSync(join(catalogDir, "index.json")),
    manifests: existsSync(join(catalogDir, "files", "better_plus-1.0.0.hpack")),
    userData: packaged.userData,
  };

  console.log("packaged:", packaged.packaged);
  console.log("catalog index:", catalog.index);
  console.log("catalog manifests:", catalog.manifests);
  console.log("userData:", catalog.userData);
  console.log("onboarding:", await page.locator(".onboarding").isVisible());

  if (!catalog.index || !catalog.manifests) process.exitCode = 1;
} finally {
  await app.close();
}
