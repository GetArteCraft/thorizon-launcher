import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  Drawer,
  EmptyState,
  PageHeader,
  Panel,
  ProgressBar,
  Select,
  TextInput,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import {
  iconFor,
  kindLabel,
  monogram,
  packsWithMod,
  projectById,
  registry,
  toneForKind,
} from "../lib/data";
import { cn, shortHash } from "../lib/format";
import type { RegistryProject } from "@shared/types";

function ProjectCard({ project, onOpen }: { project: RegistryProject; onOpen: () => void }) {
  const { t, number } = useI18n();
  const tone = toneForKind(project.kind);
  return (
    <motion.button
      type="button"
      className="project-card"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="project-card__top">
        <span className={cn("reg-tile", `tone-${tone}`)}>{monogram(project.name)}</span>
        <div className="project-card__head">
          <b>{project.name}</b>
          <span className="dim">{project.latest?.version ?? "—"}</span>
        </div>
      </div>
      <p>{project.summary}</p>
      <div className="project-card__meta">
        <span><Icon name="download" size={12} />{number(project.downloads)}</span>
        <span>{project.license}</span>
      </div>
    </motion.button>
  );
}

function ProjectDrawer({ project }: { project: RegistryProject }) {
  const { t, locale, number, date } = useI18n();
  const closeDetail = useUi((state) => state.closeDetail);
  const navigate = useUi((state) => state.navigate);
  const seedEditor = useUi((state) => state.seedEditor);
  const openDetail = useUi((state) => state.openDetail);
  const profiles = useUi((state) => state.profiles);
  const toast = useUi((state) => state.pushToast);
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const tone = toneForKind(project.kind);
  const usedBy = project.kind === "mod" || project.kind === "native-mod" ? packsWithMod(project.id) : [];
  const paragraphs = project.description.split(/\n{2,}/).filter(Boolean);
  const installable = project.kind === "shader" || project.kind === "resourcepack" || project.kind === "mod" || project.kind === "native-mod";
  const [line, setLine] = useState("");

  useEffect(() => {
    if (!api) return;
    const offProgress = api.onProjectProgress((payload) => {
      if (payload.projectId !== project.id) return;
      setProgress(payload.percent);
      if (payload.phase === "done") setInstalling(false);
    });
    const offMods = api.onModsLine((payload) => {
      if (payload.id === project.id) setLine(payload.line);
    });
    return () => {
      offProgress();
      offMods();
    };
  }, [project.id]);

  const install = async () => {
    if (!api || !profileId) return;
    setInstalling(true);
    setProgress(2);
    setLine("");
    try {
      if (project.kind === "mod" || project.kind === "native-mod") {
        const result = await api.modsInstall(project.id, profileId);
        if (!result.ok) throw new Error(result.stderr || result.error || "E_INSTALL");
        toast("success", t("mods.installed", { name: project.name }));
      } else {
        const result = await api.projectInstall(project.id, profileId);
        toast("success", t("mods.installed", { name: result.name }));
      }
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Drawer open onClose={closeDetail} label={project.name}>
      <div className="drawer__head">
        <span className={cn("reg-tile reg-tile--lg", `tone-${tone}`)}>{monogram(project.name)}</span>
        <div>
          <div className="chips">
            <Chip tone={tone === "mint" ? "mint" : tone === "blue" ? "blue" : tone === "violet" ? "violet" : "amber"}>
              {kindLabel(project.kind, locale)}
            </Chip>
            {project.pair ? <Chip tone="amber">{t("mods.pair")}</Chip> : null}
          </div>
          <h2>{project.name}</h2>
          <p className="dim">{project.summary}</p>
        </div>
      </div>

      <div className="drawer__actions">
        <a className="btn btn--primary btn--sm" href={project.source} target="_blank" rel="noreferrer noopener">
          <Icon name="external" size={14} />
          <span>{t("common.source")}</span>
        </a>
        {project.kind === "mod" || project.kind === "native-mod" ? (
          <Button
            size="sm"
            icon="wand"
            onClick={() => {
              seedEditor([project.id]);
              closeDetail();
              navigate("editor");
            }}
          >
            {t("mods.addToPack")}
          </Button>
        ) : null}
      </div>

      {installable ? (
        <section className="drawer-install">
          <h3>{t("mods.installToProfile")}</h3>
          {profiles.length === 0 ? (
            <p className="dim small">{t("mods.noProfile")}</p>
          ) : (
            <>
              <div className="drawer-install__row">
                <Select value={profileId} onChange={(event) => setProfileId(event.target.value)} aria-label={t("library.selectProfile")}>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </Select>
                <Button size="sm" variant="primary" icon="download" onClick={() => void install()} disabled={installing || !profileId}>
                  {t("common.install")}
                </Button>
              </div>
              {installing ? (
                <>
                  <ProgressBar
                    value={project.kind === "mod" || project.kind === "native-mod" ? 100 : progress}
                    indeterminate={project.kind === "mod" || project.kind === "native-mod"}
                  />
                  {line ? <code className="drawer-install__line">{line}</code> : null}
                </>
              ) : null}
              <p className="dim small">{t("shaders.installHint")}</p>
            </>
          )}
        </section>
      ) : null}

      <div className="drawer__body">
        <section>
          <h3>{t("mods.about")}</h3>
          {paragraphs.length > 0 ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>{project.summary}</p>}
        </section>

        {project.pair ? (
          <div className="notice notice--warn">
            <Icon name="alert" size={15} />
            <span>{t("mods.pairBody")}</span>
          </div>
        ) : null}

        <section>
          <h3>{t("mods.technical")}</h3>
          <dl className="spec-list">
            <div><dt>{t("common.version")}</dt><dd>{project.latest?.version ?? "—"}</dd></div>
            <div><dt>{t("common.game")}</dt><dd>{project.latest?.game ?? "26.3"}</dd></div>
            <div><dt>{t("common.license")}</dt><dd>{project.license}</dd></div>
            <div><dt>{t("mods.authors")}</dt><dd>{project.authors.join(", ") || "—"}</dd></div>
            <div><dt>{t("mods.installsLabel")}</dt><dd>{number(project.downloads)}</dd></div>
            <div><dt>{t("common.updated")}</dt><dd>{project.latest?.published ? date(project.latest.published) : "—"}</dd></div>
          </dl>
        </section>

        <section>
          <h3>{t("common.hash")}</h3>
          <div className="hash-box">
            <code>{project.latest?.file?.sha256 ?? t("mods.hashMissing")}</code>
            {project.latest?.file ? <span>{shortHash(project.latest.file.sha256, 16)}</span> : null}
          </div>
        </section>

        {usedBy.length > 0 ? (
          <section>
            <h3>{t("mods.serverPacks")}</h3>
            <div className="drawer__packs">
              {usedBy.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="drawer-pack"
                  onClick={() => openDetail("pack", pack.id)}
                >
                  <img src={iconFor(pack)} alt="" />
                  <span>
                    <b>{pack.name}</b>
                    <em>{pack.requirements.mods} {t("common.mods").toLowerCase()}</em>
                  </span>
                  <Icon name="chevronRight" size={14} />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <p className="dim small">{t("legal.files")}</p>
      </div>
    </Drawer>
  );
}

function useProjectDetail(kind: "mod" | "shader" | "resourcepack") {
  const detail = useUi((state) => state.detail);
  if (!detail || detail.kind !== kind) return null;
  return projectById(detail.id) ?? null;
}

export function ModsScreen() {
  const { t, number } = useI18n();
  const openDetail = useUi((state) => state.openDetail);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "native-mod" | "mod">("all");
  const selected = useProjectDetail("mod");

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return registry.mods.filter((project) => {
      if (kind !== "all" && project.kind !== kind) return false;
      if (!needle) return true;
      return [project.name, project.id, project.summary, ...project.tags, ...project.authors]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, kind]);

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.catalog")}
        title={t("mods.title")}
        lead={t("mods.lead")}
        actions={<div className="header-count"><b>{number(list.length)}</b><span>/ {registry.mods.length}</span></div>}
      />

      <div className="filterbar">
        <div className="search-field">
          <Icon name="search" size={16} />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("mods.search")}
            aria-label={t("mods.search")}
          />
        </div>
        <div className="segmented">
          <button type="button" className={cn(kind === "all" && "is-active")} onClick={() => setKind("all")}>
            {t("common.all")}
          </button>
          <button type="button" className={cn(kind === "native-mod" && "is-active")} onClick={() => setKind("native-mod")}>
            {t("mods.kind.native")}
          </button>
          <button type="button" className={cn(kind === "mod" && "is-active")} onClick={() => setKind("mod")}>
            {t("mods.kind.content")}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="cube" title={t("mods.empty")} body={t("mods.empty.body")} action={<Button icon="refresh" onClick={() => { setQuery(""); setKind("all"); }}>{t("common.reset")}</Button>} />
      ) : (
        <div className="project-grid">
          {list.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => openDetail("mod", project.id)} />
          ))}
        </div>
      )}

      {selected ? <ProjectDrawer project={selected} /> : null}
    </div>
  );
}

export function ShadersScreen() {
  const { t, number } = useI18n();
  const openDetail = useUi((state) => state.openDetail);
  const [query, setQuery] = useState("");
  const selected = useProjectDetail("shader");

  const list = registry.shaders.filter((project) => {
    if (!query) return true;
    return [project.name, project.summary, ...project.tags].join(" ").toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.catalog")}
        title={t("shaders.title")}
        lead={t("shaders.lead")}
        actions={<div className="header-count"><b>{number(list.length)}</b><span>/ {registry.shaders.length}</span></div>}
      />

      <div className="filterbar">
        <div className="search-field">
          <Icon name="search" size={16} />
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("shaders.search")} aria-label={t("shaders.search")} />
        </div>
        <Chip tone="violet" icon="info">{t("shaders.installHint")}</Chip>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="sparkles" title={t("shaders.empty")} body={t("mods.empty.body")} action={<Button icon="refresh" onClick={() => setQuery("")}>{t("common.reset")}</Button>} />
      ) : (
        <div className="project-grid project-grid--wide">
          {list.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => openDetail("shader", project.id)} />
          ))}
        </div>
      )}

      <Panel title={t("shaders.cost")}>
        <p className="prose">{t("shaders.costBody")}</p>
      </Panel>

      {selected ? <ProjectDrawer project={selected} /> : null}
    </div>
  );
}

export function ResourcePacksScreen() {
  const { t, number } = useI18n();
  const openDetail = useUi((state) => state.openDetail);
  const selected = useProjectDetail("resourcepack");

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.catalog")}
        title={t("rp.title")}
        lead={t("rp.lead")}
        actions={<div className="header-count"><b>{number(registry.resourcepacks.length)}</b><span>{t("home.stat.projects")}</span></div>}
      />

      <div className="notice">
        <Icon name="info" size={16} />
        <span>{t("rp.note")}</span>
      </div>

      {registry.resourcepacks.length === 0 ? (
        <EmptyState icon="layers" title={t("rp.empty")} body={t("mods.empty.body")} />
      ) : (
        <div className="project-grid project-grid--wide">
          {registry.resourcepacks.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => openDetail("resourcepack", project.id)} />
          ))}
        </div>
      )}

      {selected ? <ProjectDrawer project={selected} /> : null}
    </div>
  );
}
