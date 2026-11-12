import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { WebContents } from "electron";
import { getProject } from "./catalog";
import { profilesRoot } from "./profiles";
import { log } from "./logger";
import { bump } from "./stats";

export interface ProjectInstallResult {
  name: string;
  path: string;
  size: number;
  sha256: string;
}

/**
 * Шейдеры и ресурспаки качаются напрямую: .hpack их не содержит, а официальный
 * CLI ставит только моды. Файл проверяется по SHA-256 из реестра.
 * [предположение] папки: shaderpacks/ и resourcepacks/ внутри профиля.
 */
export async function installProjectFile(
  projectId: string,
  profileId: string,
  sender: WebContents,
): Promise<ProjectInstallResult> {
  const project = getProject(projectId);
  if (!project) throw new Error("E_NOT_FOUND");
  if (project.kind !== "shader" && project.kind !== "resourcepack") {
    throw new Error("E_NOT_INSTALLABLE");
  }
  const file = project.latest?.file;
  if (!file) throw new Error("E_NO_FILE");

  const profileDir = join(profilesRoot(), profileId);
  if (!existsSync(profileDir)) throw new Error("E_NO_PROFILE");

  const folder = join(profileDir, project.kind === "shader" ? "shaderpacks" : "resourcepacks");
  await mkdir(folder, { recursive: true });

  const send = (percent: number, phase: "downloading" | "verifying" | "done") => {
    if (!sender.isDestroyed()) sender.send("project:progress", { projectId, percent, phase });
  };

  send(2, "downloading");
  const response = await fetch(file.url, { redirect: "follow" });
  if (!response.ok) throw new Error(`E_HTTP_${response.status}`);

  const total = Number(response.headers.get("content-length") ?? file.size ?? 0);
  const chunks: Buffer[] = [];
  let received = 0;

  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const chunk = Buffer.from(value);
        chunks.push(chunk);
        received += chunk.length;
        const percent = total > 0 ? Math.min(95, Math.round((received / total) * 90) + 2) : 45;
        send(percent, "downloading");
      }
    }
  } else {
    chunks.push(Buffer.from(await response.arrayBuffer()));
  }

  const buffer = Buffer.concat(chunks);
  send(96, "verifying");
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (sha256.toLowerCase() !== file.sha256.toLowerCase()) {
    throw new Error("E_HASH");
  }

  const target = join(folder, file.name);
  await writeFile(target, buffer);
  send(100, "done");
  log("info", "project", `installed ${project.id} into ${profileId}`);
  await bump("imports");
  return { name: file.name, path: target, size: buffer.length, sha256 };
}
