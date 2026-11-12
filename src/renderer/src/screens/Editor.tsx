import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  Field,
  PageHeader,
  Panel,
  Select,
  TextInput,
  Toggle,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { packs, projectById, registry } from "../lib/data";
import { validateSelection } from "@shared/editor";
import { cn } from "../lib/format";
import type { EditorManifest, RegistryProject } from "@shared/types";

function idFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function EditorScreen() {
  const { t, locale } = useI18n();
  const seed = useUi((state) => state.editorSeed);
  const setProfiles = useUi((state) => state.setProfiles);
  const toast = useUi((state) => state.pushToast);
  const profiles = useUi((state) => state.profiles);

  const [name, setName] = useState("My pack");
  const [id, setId] = useState("my_pack");
  const [idTouched, setIdTouched] = useState(false);
  const [version, setVersion] = useState("1.0.0");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [createProfile, setCreateProfile] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (seed.length === 0) return;
    setSelected((current) => [...new Set([...current, ...seed])]);
  }, [seed]);

  const issues = useMemo(() => validateSelection(selected, projectById), [selected]);
  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warn");

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return registry.mods
      .filter((project) => !needle || `${project.name} ${project.id} ${project.summary}`.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [query]);

  const toggle = (project: RegistryProject) => {
    setSelected((current) =>
      current.includes(project.id)
        ? current.filter((item) => item !== project.id)
        : [...current, project.id],
    );
  };

  const applyPack = (packId: string) => {
    const pack = packs.find((item) => item.id === packId);
    if (!pack) return;
    setSelected(pack.mods.map((mod) => mod.id));
    setName(`${pack.name} (edit)`);
    setId(`${pack.id}_edit`);
    setVersion(pack.version);
    setDescription(pack.summary);
    setIdTouched(true);
  };

  const manifest: EditorManifest = useMemo(
    () => ({
      id,
      name,
      version,
      description: description || name,
      authors: ["THorizon"],
      game: "26.3",
      mods: selected
        .map((modId) => {
          const project = projectById(modId);
          if (!project) return null;
          return {
            id: modId,
            version: project.latest?.version ?? "1.0.0",
            license: project.license,
          };
        })
        .filter((mod): mod is NonNullable<typeof mod> => mod !== null),
    }),
    [id, name, version, description, selected],
  );

  const exportPack = async () => {
    if (!api) return;
    if (errors.length > 0) {
      toast("error", t("editor.exportFailed"));
      return;
    }
    setBusy(true);
    try {
      const result = await api.editorExport(manifest);
      if (!result.path) {
        toast("error", t("editor.exportFailed"));
        return;
      }
      toast("success", t("editor.exported", { path: result.path }));
      if (createProfile) {
        await api.profilesCreate({
          id,
          name,
          packId: id,
          packName: name,
          version,
          game: "26.3",
          source: "editor",
          mods: selected.length,
          note: "Built in the pack editor",
        });
        setProfiles(await api.profilesList());
        toast("success", t("editor.profileCreated", { name }));
      }
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.system")}
        title={t("editor.title")}
        lead={t("editor.lead")}
        actions={
          <div className="filterbar__right">
            <Button
              icon="refresh"
              onClick={() => {
                setSelected([]);
                setName("My pack");
                setId("my_pack");
                setDescription("");
                setIdTouched(false);
              }}
            >
              {t("editor.clear")}
            </Button>
            <Button variant="primary" icon="download" onClick={() => void exportPack()} disabled={busy || errors.length > 0 || selected.length === 0}>
              {t("editor.export")}
            </Button>
          </div>
        }
      />

      <div className="editor-grid">
        <div className="editor-main">
          <Panel title={t("pack.about")}>
            <div className="form-grid">
              <Field label={t("editor.name")}>
                <TextInput
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!idTouched) setId(idFrom(event.target.value));
                  }}
                  placeholder="My pack"
                />
              </Field>
              <Field label={t("editor.id")}>
                <TextInput
                  value={id}
                  onChange={(event) => {
                    setId(event.target.value);
                    setIdTouched(true);
                  }}
                  placeholder="my_pack"
                  className="mono"
                />
              </Field>
              <Field label={t("editor.version")}>
                <TextInput value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" />
              </Field>
              <Field label={t("editor.load")}>
                <Select value="" onChange={(event) => applyPack(event.target.value)}>
                  <option value="">—</option>
                  {packs.map((pack) => (
                    <option key={pack.id} value={pack.id}>{pack.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("editor.description")} className="field--wide">
                <textarea
                  className="input textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder={t("editor.description")}
                />
              </Field>
            </div>
          </Panel>

          <Panel
            title={t("editor.selected", { n: selected.length })}
            action={<Chip tone={errors.length ? "red" : warnings.length ? "amber" : "mint"}>{t("editor.mods", { n: selected.length })}</Chip>}
          >
            {selected.length === 0 ? (
              <div className="editor-empty">
                <p>{t("editor.empty")}</p>
                <span className="dim">{t("editor.emptyBody")}</span>
              </div>
            ) : (
              <div className="selected-list">
                {selected.map((modId) => {
                  const project = projectById(modId);
                  return (
                    <div className="selected-row" key={modId}>
                      <span className="reg-tile reg-tile--sm">{project ? project.name.slice(0, 1) : "?"}</span>
                      <span className="selected-row__name">
                        <b>{project?.name ?? modId}</b>
                        <em>{project?.latest?.version ?? "—"} · {project?.license ?? "—"}</em>
                      </span>
                      <button type="button" className="icon-btn" aria-label={t("common.remove")} onClick={() => project && toggle(project)}>
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title={t("editor.issues")}
            action={
              <span className={cn("issue-count", errors.length ? "is-bad" : warnings.length ? "is-warn" : "is-ok")}>
                {t("editor.issueCount", { errors: errors.length, warnings: warnings.length })}
              </span>
            }
          >
            {issues.length === 0 ? (
              <div className="notice notice--ok">
                <Icon name="check" size={16} />
                <span>{t("editor.noIssues")}</span>
              </div>
            ) : (
              <div className="issue-list">
                {issues.map((issue, index) => (
                  <div className={cn("issue", issue.level === "error" ? "issue--error" : "issue--warn")} key={`${issue.code}-${index}`}>
                    <Icon name={issue.level === "error" ? "alert" : "info"} size={15} />
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="dim small">{t("editor.conflictNote")}</p>
            <div className="setting-inline" style={{ marginTop: 10 }}>
              <span>{t("editor.createProfile")}</span>
              <Toggle checked={createProfile} onChange={setCreateProfile} label={t("editor.createProfile")} />
            </div>
            {profiles.length > 0 ? (
              <p className="dim small">{t("instances.lead")}</p>
            ) : null}
          </Panel>
        </div>

        <aside className="editor-picker">
          <Panel
            title={t("editor.search")}
            action={<Chip tone="blue">{registry.mods.length}</Chip>}
          >
            <div className="search-field">
              <Icon name="search" size={15} />
              <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("editor.search")} />
            </div>
            <div className="picker-list">
              {available.map((project) => {
                const isSelected = selected.includes(project.id);
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={cn("picker-row", isSelected && "is-selected")}
                    onClick={() => toggle(project)}
                  >
                    <span className={cn("reg-tile reg-tile--sm", project.kind === "native-mod" ? "tone-mint" : "tone-blue")}>
                      {project.name.slice(0, 1)}
                    </span>
                    <span className="picker-row__copy">
                      <b>{project.name}</b>
                      <em>{project.summary}</em>
                    </span>
                    <span className="picker-row__check">
                      <Icon name={isSelected ? "check" : "plus"} size={14} />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="dim small">{t("editor.pickHint")}</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
