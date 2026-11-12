import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  Select,
  Toggle,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { formatBytes, shortHash } from "../lib/format";
import type { LocalFile } from "@shared/types";

function kindOf(file: LocalFile): "mod" | "native" | "pack" | "shader" | "archive" | "other" {
  switch (file.kind) {
    case "mod":
      return "mod";
    case "native-mod":
      return "native";
    case "pack":
      return "pack";
    case "shader":
      return "shader";
    case "archive":
      return "archive";
    default:
      return "other";
  }
}

export function LibraryScreen() {
  const { t, locale } = useI18n();
  const profiles = useUi((state) => state.profiles);
  const navigate = useUi((state) => state.navigate);
  const toast = useUi((state) => state.pushToast);
  const limit = useUi((state) => state.settings.importLimitMb);
  const [profileId, setProfileId] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState<LocalFile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profileId && profiles[0]) setProfileId(profiles[0].id);
    if (profileId && !profiles.some((profile) => profile.id === profileId)) {
      setProfileId(profiles[0]?.id ?? "");
    }
  }, [profiles, profileId]);

  const refresh = async (id = profileId) => {
    if (!api || !id) {
      setFiles([]);
      return;
    }
    setLoading(true);
    try {
      setFiles(await api.localList(id));
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh(profileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  const importPaths = async (paths: string[]) => {
    if (!api || !profileId || paths.length === 0) return;
    try {
      const imported = await api.localImport(profileId, paths);
      toast("success", t("library.imported", { n: imported.length }));
      await refresh();
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const pick = async () => {
    if (!api || !profileId) return;
    try {
      const imported = await api.localPick(profileId);
      if (imported.length > 0) {
        toast("success", t("library.imported", { n: imported.length }));
        await refresh();
      }
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const toggle = async (file: LocalFile, enabled: boolean) => {
    if (!api || !profileId) return;
    try {
      await api.localToggle(profileId, file.name, enabled);
      await refresh();
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const remove = async () => {
    if (!api || !profileId || !removing) return;
    setBusy(true);
    try {
      await api.localRemove(profileId, removing.name);
      toast("success", t("library.removed"));
      setRemoving(null);
      await refresh();
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const bridge = api;
    if (!bridge) return;
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => {
        try {
          return bridge.getFilePath(file);
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    void importPaths(paths);
  };

  const current = useMemo(() => profiles.find((profile) => profile.id === profileId), [profiles, profileId]);

  return (
    <div
      className={`screen library ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <PageHeader
        eyebrow={t("nav.group.system")}
        title={t("library.title")}
        lead={t("library.lead")}
        actions={
          <div className="filterbar__right">
            <Select
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              aria-label={t("library.selectProfile")}
            >
              <option value="">{t("library.selectProfile")}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </Select>
            <Button icon="folder" onClick={() => profileId && void api?.openPath("profile", profileId)} disabled={!profileId}>
              {t("instances.openFolder")}
            </Button>
            <Button variant="primary" icon="upload" onClick={() => void pick()} disabled={!profileId}>
              {t("library.import")}
            </Button>
          </div>
        }
      />

      {profiles.length === 0 ? (
        <EmptyState
          icon="library"
          title={t("library.empty")}
          body={t("library.emptyBody")}
          action={<Button variant="primary" icon="play" onClick={() => navigate("instances")}>{t("instances.title")}</Button>}
        />
      ) : (
        <>
          <div className="library__bar">
            <span className="dim">
              {current ? `${current.name} · ${files.length} ${t("common.mods").toLowerCase()}` : t("library.noProfile")}
            </span>
            <span className="dim">{t("library.limit", { mb: limit })}</span>
          </div>

          <div className="dropzone">
            <Icon name="upload" size={22} />
            <b>{dragging ? t("library.dropActive") : t("library.drop")}</b>
            <span>.hmod · .hnmod · .hpack · .hshader · .zip</span>
          </div>

          {loading ? (
            <div className="table-skeleton" aria-label={t("common.loading")} role="status">
              {[1, 2, 3].map((index) => <span key={index} />)}
            </div>
          ) : files.length === 0 ? (
            <EmptyState
              icon="package"
              title={t("library.emptyProfile")}
              body={t("library.emptyBody")}
              action={<Button icon="upload" onClick={() => void pick()}>{t("library.import")}</Button>}
            />
          ) : (
            <div className="file-table">
              <div className="file-table__head">
                <span>{t("common.source")}</span>
                <span>{t("common.size")}</span>
                <span>{t("common.hash")}</span>
                <span>{t("library.toggle")}</span>
                <span />
              </div>
              {files.map((file) => {
                const kind = kindOf(file);
                return (
                  <div className={`file-row ${file.enabled ? "" : "is-disabled"}`} key={file.name}>
                    <div className="file-row__name">
                      <span className={`file-badge file-badge--${kind}`}>{file.ext.replace(".", "").slice(0, 4)}</span>
                      <span>
                        <b>{file.name}</b>
                        <em>{file.modified.slice(0, 10)}</em>
                      </span>
                    </div>
                    <span className="dim">{formatBytes(file.size)}</span>
                    <span className="mono dim">{shortHash(file.sha256, 8)}</span>
                    <div className="file-row__toggle">
                      <Toggle
                        checked={file.enabled}
                        onChange={(value) => void toggle(file, value)}
                        label={file.enabled ? t("library.toggle") : t("library.disabled")}
                      />
                      <Chip tone={file.enabled ? "mint" : "plain"}>
                        {file.enabled ? t("library.toggle") : t("library.disabled")}
                      </Chip>
                    </div>
                    <IconButton icon="trash" label={t("common.remove")} onClick={() => setRemoving(file)} />
                  </div>
                );
              })}
            </div>
          )}

          <div className="notice notice--warn">
            <Icon name="alert" size={16} />
            <span>{t("library.warning")}</span>
          </div>
        </>
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("common.remove")}
        footer={
          <>
            <Button onClick={() => setRemoving(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button variant="danger" icon="trash" onClick={() => void remove()} disabled={busy}>
              {t("common.remove")}
            </Button>
          </>
        }
      >
        <p>{removing?.name}</p>
      </Modal>
    </div>
  );
}
