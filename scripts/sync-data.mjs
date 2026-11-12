import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "..");
const generated = join(repo, "site", "src", "content", "generated");
const icons = join(repo, "site", "public", "icons", "packs");
const officialIndex = join(repo, "data", "official-index.json");
const catalogIndex = join(repo, "dist", "catalog", "index.json");
const catalogFiles = join(repo, "dist", "catalog", "files");

const dataTarget = join(root, "src", "shared", "data");
const iconTarget = join(root, "src", "renderer", "public", "icons", "packs");
const catalogTarget = join(root, "resources", "catalog");
const catalogFilesTarget = join(catalogTarget, "files");

async function copyIfExists(from, to) {
  if (!existsSync(from)) return false;
  await mkdir(dirname(to), { recursive: true });
  await copyFile(from, to);
  return true;
}

let copied = 0;

for (const name of ["packs.json", "registry.json"]) {
  if (await copyIfExists(join(generated, name), join(dataTarget, name))) copied += 1;
}

if (existsSync(icons)) {
  const files = (await readdir(icons)).filter((name) => name.endsWith(".png"));
  await mkdir(iconTarget, { recursive: true });
  for (const name of files) {
    await copyFile(join(icons, name), join(iconTarget, name));
    copied += 1;
  }
}

/**
 * Собираем локальный индекс реестра: официальные 158 проектов + наши 20 сборок.
 * URL манифестов остаются относительными (`files/...`), main превращает их в file://
 * при запуске — так индекс работает и из папки репозитория, и из установленного app.
 */
if (existsSync(officialIndex) && existsSync(catalogIndex) && existsSync(catalogFiles)) {
  const official = JSON.parse(await readFile(officialIndex, "utf8"));
  const ours = JSON.parse(await readFile(catalogIndex, "utf8"));
  await mkdir(catalogFilesTarget, { recursive: true });

  for (const project of ours.projects ?? []) {
    for (const version of project.versions ?? []) {
      const name = version?.file?.name;
      const source = name ? join(catalogFiles, name) : null;
      if (name && source && existsSync(source)) {
        await copyFile(source, join(catalogFilesTarget, name));
        version.file.url = `files/${name}`;
      }
    }
  }

  const merged = {
    schema: official.schema ?? 1,
    generated: new Date().toISOString(),
    projects: [...(official.projects ?? []), ...(ours.projects ?? [])],
  };
  await writeFile(join(catalogTarget, "index.json"), `${JSON.stringify(merged, null, 1)}\n`, "utf8");
  copied += 1;
  console.log(`sync: local index ${merged.projects.length} projects (${ours.projects?.length ?? 0} packs)`);
}

if (copied === 0) {
  console.log("sync: no archive data next to the launcher; using the committed catalog");
} else {
  console.log(`sync: ${copied} catalog file(s) refreshed from the site`);
}
