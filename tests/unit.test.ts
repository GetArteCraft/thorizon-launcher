import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import packsJson from "../src/shared/data/packs.json";
import registryJson from "../src/shared/data/registry.json";
import { CLUSTERS, PAIRS, ID_PATTERN, POLICY_BLOCKED, tomlManifest, validateSelection } from "../src/shared/editor";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/shared/settings";
import { parseAccount, parseVersions } from "../src/shared/cli-parse";
import { en, ru } from "../src/renderer/src/i18n/messages";
import type { Catalog, Registry, RegistryProject } from "../src/shared/types";

const catalog = packsJson as unknown as Catalog;
const registry = registryJson as unknown as Registry;
const all: RegistryProject[] = [...registry.mods, ...registry.shaders, ...registry.resourcepacks];
const lookup = (id: string) => all.find((project) => project.id === id);

describe("settings", () => {
  it("merges a broken file with defaults instead of throwing", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ schema: 0 })).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps numbers and rejects unknown enum values", () => {
    const settings = normalizeSettings({
      theme: "neon",
      quality: "ultra",
      launchMode: "cinema",
      launchWidth: 100,
      launchHeight: 99999,
      parallelDownloads: 99,
      soundVolume: 0.3,
      window: { width: 10, height: 100000 },
    });
    expect(settings.theme).toBe("dark");
    expect(settings.quality).toBe("auto");
    expect(settings.launchMode).toBe("windowed");
    expect(settings.launchWidth).toBe(640);
    expect(settings.launchHeight).toBe(4320);
    expect(settings.parallelDownloads).toBe(8);
    expect(settings.soundVolume).toBe(0.3);
    expect(settings.window.width).toBe(1080);
    expect(settings.window.height).toBe(2160);
  });

  it("keeps a partial patch and drops a missing launch profile", () => {
    const settings = normalizeSettings({ defaultProfile: null, updateChannel: "beta", closeToTray: false });
    expect(settings.defaultProfile).toBeNull();
    expect(settings.updateChannel).toBe("beta");
    expect(settings.closeToTray).toBe(false);
  });
});

describe("catalog", () => {
  it("has 20 unique packs and the expected registry split", () => {
    expect(catalog.packs).toHaveLength(20);
    expect(new Set(catalog.packs.map((pack) => pack.id)).size).toBe(20);
    expect(registry.counts).toEqual({ all: 158, mods: 144, shaders: 12, resourcepacks: 2 });
    expect(registry.mods).toHaveLength(144);
    expect(registry.shaders).toHaveLength(12);
    expect(registry.resourcepacks).toHaveLength(2);
  });

  it("points every pack mod at a registry version with a hash", () => {
    for (const pack of catalog.packs) {
      expect(pack.mods.length).toBeGreaterThanOrEqual(10);
      for (const ref of pack.mods) {
        const project = lookup(ref.id);
        expect(project, `${pack.id}: ${ref.id}`).toBeDefined();
        expect(project?.latest?.version, `${pack.id}: ${ref.id}`).toBe(ref.version);
        expect(project?.latest?.file?.sha256, `${pack.id}: ${ref.id}`).toMatch(/^[a-f0-9]{64}$/);
      }
    }
  });

  it("ships an icon for every pack", () => {
    for (const pack of catalog.packs) {
      const icon = join(process.cwd(), "src", "renderer", "public", "icons", "packs", `${pack.id}.png`);
      expect(existsSync(icon), icon).toBe(true);
    }
  });

  it("builds the local CLI index with 178 projects and local manifests", async () => {
    const index = JSON.parse(
      await import("node:fs/promises").then((fs) =>
        fs.readFile(join(process.cwd(), "resources", "catalog", "index.json"), "utf8"),
      ),
    ) as { projects: Array<{ kind?: string; versions?: Array<{ file?: { url?: string } }> }> };
    expect(index.projects).toHaveLength(178);
    const modpacks = index.projects.filter((project) => project.kind === "modpack");
    expect(modpacks).toHaveLength(20);
    for (const pack of modpacks) {
      const url = pack.versions?.[0]?.file?.url ?? "";
      expect(url.startsWith("files/")).toBe(true);
      expect(existsSync(join(process.cwd(), "resources", "catalog", url))).toBe(true);
    }
  });
});

describe("editor validation", () => {
  it("catches a functional duplicate", () => {
    const issues = validateSelection(["jei", "recipes"], lookup);
    expect(issues.some((issue) => issue.level === "error" && issue.code === "cluster")).toBe(true);
  });

  it("warns about a half-installed pair", () => {
    const issues = validateSelection(["projecte_core"], lookup);
    expect(issues.some((issue) => issue.code === "pair" && issue.level === "warn")).toBe(true);
  });

  it("blocks policy mods and shaders inside a pack", () => {
    expect(validateSelection(["imfast"], lookup).some((issue) => issue.code === "policy")).toBe(true);
    expect(validateSelection(["daybreak"], lookup).some((issue) => issue.code === "kind")).toBe(true);
  });

  it("accepts a clean selection", () => {
    expect(validateSelection(["jei", "zoom", "jade"], lookup)).toHaveLength(0);
  });

  it("covers every cluster with at least two unique members", () => {
    for (const cluster of CLUSTERS) {
      expect(cluster.ids.length).toBeGreaterThanOrEqual(2);
      expect(new Set(cluster.ids).size, cluster.key).toBe(cluster.ids.length);
    }
    for (const pair of PAIRS) {
      expect(POLICY_BLOCKED.has(pair.native)).toBe(false);
    }
  });

  it("writes a TOML manifest with exact versions and hashes", () => {
    const mod = lookup("jei");
    const toml = tomlManifest(
      {
        id: "clean_pack",
        name: "Clean pack",
        version: "1.0.0",
        description: "A small test pack.",
        authors: ["THorizon"],
        game: "26.3",
        mods: [{ id: "jei", version: mod?.latest?.version ?? "1.0.0", license: "MIT" }],
      },
      { jei: mod?.latest?.file?.sha256 ?? null },
    );
    expect(toml).toContain("format = 1");
    expect(toml).toContain('id = "clean_pack"');
    expect(toml).toContain("[[mods]]");
    expect(toml).toContain(`version = "${mod?.latest?.version}"`);
    expect(toml).toContain(`sha256 = "${mod?.latest?.file?.sha256}"`);
    expect(toml).not.toContain("license");
  });

  it("skips a mod without a hash and keeps the id pattern strict", () => {
    const toml = tomlManifest(
      {
        id: "x",
        name: "X",
        version: "1.0.0",
        description: "",
        authors: [],
        game: "26.3",
        mods: [{ id: "jei", version: "1.0.0", license: "MIT" }],
      },
      { jei: null },
    );
    expect(toml).not.toContain("[[mods]]");
    expect(ID_PATTERN.test("clean_pack")).toBe(true);
    expect(ID_PATTERN.test("Clean-Pack")).toBe(false);
  });
});

describe("CLI parsing", () => {
  it("reads versions from JSON and falls back to text", () => {
    expect(parseVersions('{"versions":[{"version":"26.3"},{"tag":"26.2"}]}').installed).toEqual([
      "26.3",
      "26.2",
    ]);
    expect(parseVersions("installed: 26.3 and 26.1").installed).toContain("26.3");
  });

  it("finds an account name and the Java flag", () => {
    const account = parseAccount('{"accounts":[{"name":"Steve","owns_java":true}]}');
    expect(account.name).toBe("Steve");
    expect(account.ownsJava).toBe(true);
    expect(parseAccount("not json")).toEqual({ name: null, ownsJava: null });
  });
});

describe("i18n", () => {
  it("has the same keys in English and Russian", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  it("has no empty strings and matching placeholders", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim().length, key).toBeGreaterThan(0);
      expect(ru[key]?.trim().length, key).toBeGreaterThan(0);
      const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      expect(placeholders(ru[key] ?? ""), key).toEqual(placeholders(value));
    }
  });
});
