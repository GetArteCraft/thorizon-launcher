import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  TextInput,
  Toggle,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { iconFor, packs } from "../lib/data";
import { formatBytes, timeAgo } from "../lib/format";
import type { Profile } from "@shared/types";

export function InstancesScreen() {
  const { t, locale } = useI18n();
  const profiles = useUi((state) => state.profiles);
  const setProfiles = useUi((state) => state.setProfiles);
  const navigate = useUi((state) => state.navigate);
  const toast = useUi((state) => state.pushToast);
  const settings = useUi((state) => state.settings);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [building, setBuilding] = useState<Profile | null>(null);
  const native = useUi((state) => state.native);
  const startNative = useUi((state) => state.startNative);
  const finishNative = useUi((state) => state.finishNative);
  const [launchMode, setLaunchMode] = useState(settings.launchMode);
  const [width, setWidth] = useState(settings.launchWidth);
  const [height, setHeight] = useState(settings.launchHeight);
  const [args, setArgs] = useState(settings.launchArgs);
  const [hide, setHide] = useState(settings.hideLauncherOnPlay);
  const [busy, setBusy] = useState(false);

  const list = useMemo(
    () =>
      profiles.filter((profile) =>
        `${profile.name} ${profile.packName} ${profile.packId ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [profiles, query],
  );

  const refresh = async () => {
    if (!api) return;
    setProfiles(await api.profilesList());
  };

  const play = async (profile: Profile) => {
    if (!api) return;
    try {
      const result = await api.profilesPlay(profile.id);
      if (!result.ok) toast("error", t("instances.playFailed"));
      else toast("success", t("instances.started"));
      void refresh();
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const remove = async () => {
    if (!api || !deleting) return;
    setBusy(true);
    try {
      await api.profilesDelete(deleting.id);
      toast("success", t("common.deleted"));
      setDeleting(null);
      await refresh();
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setBusy(false);
    }
  };

  const openLaunch = (profile: Profile) => {    setEditing(profile);
    setLaunchMode(profile.launch?.launchMode ?? settings.launchMode);
    setWidth(profile.launch?.launchWidth ?? settings.launchWidth);
    setHeight(profile.launch?.launchHeight ?? settings.launchHeight);
    setArgs(profile.launch?.launchArgs ?? settings.launchArgs);
    setHide(profile.launch?.hideLauncherOnPlay ?? settings.hideLauncherOnPlay);
  };

  const startBuild = (profile: Profile) => {    if (!api) return;
    setBuilding(profile);
    startNative(profile.id);
    void api
      .profilesNativeBuild(profile.id)
      .then((result) => {
        finishNative(profile.id, result.ok);
        toast(result.ok ? "success" : "error", result.ok ? t("instances.buildDone") : t("instances.buildFailed"));
      })
      .catch((error) => {
        finishNative(profile.id, false);
        toast("error", errorText(error, locale));
      });
  };

  const backup = async (profile: Profile) => {
    if (!api) return;
    try {
      const result = await api.backupsCreate(profile.id);
      if (!result) toast("info", t("instances.backupEmpty"));
      else toast("success", t("instances.backupDone", { files: result.files, size: formatBytes(result.bytes) }));
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const saveLaunch = async () => {
    if (!api || !editing) return;
    if (/["%]/.test(args)) {
      toast("error", t("settings.invalidArgs"));
      return;
    }
    setBusy(true);
    try {
      await api.profilesUpdateLaunch(editing.id, {
        launchMode,
        launchWidth: width,
        launchHeight: height,
        launchArgs: args,
        hideLauncherOnPlay: hide,
      });
      setEditing(null);
      toast("success", t("common.saved"));
      await refresh();
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setBusy(false);
    }
  };

  const buildState = building ? native[building.id] : undefined;

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.play")}
        title={t("instances.title")}
        lead={t("instances.lead")}
        actions={
          <div className="filterbar__right">
            <div className="search-field search-field--compact">
              <Icon name="search" size={14} />
              <TextInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("instances.filter")}
                aria-label={t("instances.filter")}
              />
            </div>
            <Button icon="grid" onClick={() => navigate("packs")}>{t("packs.title")}</Button>
          </div>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon="play"
          title={t("instances.empty")}
          body={t("instances.emptyBody")}
          action={<Button variant="primary" icon="grid" onClick={() => navigate("packs")}>{t("home.quick.packs")}</Button>}
        />
      ) : (
        <div className="instance-grid">
          {list.map((profile, index) => {
            const pack = packs.find((item) => item.id === profile.packId);
            return (
              <motion.article
                key={profile.id}
                className="instance-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <div className="instance-card__top">
                  <img src={iconFor(pack)} alt="" />
                  <div className="instance-card__head">
                    <b>{profile.name}</b>
                    <span className="dim">{profile.version} · {profile.game}</span>
                  </div>
                  <Chip tone={profile.source === "cli" ? "mint" : profile.source === "editor" ? "violet" : "blue"}>
                    {t(`instances.source.${profile.source}`)}
                  </Chip>
                </div>

                <div className="instance-card__meta">
                  <span><Icon name="cube" size={13} />{t("instances.mods", { n: profile.mods })}</span>
                  <span><Icon name="monitor" size={13} />{formatBytes(profile.sizeBytes)}</span>
                  <span><Icon name="clock" size={13} />{profile.lastPlayed ? timeAgo(profile.lastPlayed, locale) : t("instances.never")}</span>
                </div>

                <div className="instance-card__actions">
                  <Button variant="primary" icon="play" onClick={() => void play(profile)}>
                    {t("instances.play")}
                  </Button>
                  <Button size="sm" icon="folder" onClick={() => void api?.profilesOpen(profile.id)}>
                    {t("instances.openFolder")}
                  </Button>
                  <Button size="sm" icon="monitor" onClick={() => openLaunch(profile)}>
                    {t("instances.launch")}
                  </Button>
                  <Button size="sm" icon="folder" onClick={() => void backup(profile)}>
                    {t("instances.backup")}
                  </Button>
                  {profile.source === "cli" ? (
                    <Button size="sm" icon="cpu" onClick={() => startBuild(profile)}>
                      {t("instances.build")}
                    </Button>
                  ) : null}
                  {profile.source !== "cli" ? (
                    <Button size="sm" variant="danger" icon="trash" onClick={() => setDeleting(profile)}>
                      {t("instances.delete")}
                    </Button>
                  ) : null}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t("instances.delete")}
        footer={
          <>
            <Button onClick={() => setDeleting(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button variant="danger" icon="trash" onClick={() => void remove()} disabled={busy}>
              {t("common.remove")}
            </Button>
          </>
        }
      >
        <p>{deleting ? t("instances.deleteConfirm", { name: deleting.name }) : ""}</p>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("instances.launch")}
        width={560}
        footer={
          <>
            <Button onClick={() => setEditing(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button variant="primary" icon="check" onClick={() => void saveLaunch()} disabled={busy}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <p className="dim">{t("instances.launchHint")}</p>
        <div className="form-grid">
          <Field label={t("settings.launchMode")}>
            <Select value={launchMode} onChange={(event) => setLaunchMode(event.target.value as typeof launchMode)}>
              <option value="windowed">{t("settings.launchMode.windowed")}</option>
              <option value="borderless">{t("settings.launchMode.borderless")}</option>
              <option value="fullscreen">{t("settings.launchMode.fullscreen")}</option>
            </Select>
          </Field>
          <Field label={t("settings.launchWidth")}>
            <TextInput type="number" value={width} min={640} max={7680} onChange={(event) => setWidth(Number(event.target.value))} />
          </Field>
          <Field label={t("settings.launchHeight")}>
            <TextInput type="number" value={height} min={480} max={4320} onChange={(event) => setHeight(Number(event.target.value))} />
          </Field>
          <Field label={t("settings.launchArgs")} hint={t("settings.launchArgsBody")} className="field--wide">
            <TextInput value={args} onChange={(event) => setArgs(event.target.value)} placeholder="—" />
          </Field>
          <div className="field field--wide setting-inline">
            <span>{t("settings.hideLauncherOnPlay")}</span>
            <Toggle checked={hide} onChange={setHide} label={t("settings.hideLauncherOnPlay")} />
          </div>
        </div>
      </Modal>
      <Modal
        open={building !== null}
        onClose={() => setBuilding(null)}
        title={t("instances.build")}
        width={720}
        footer={<Button onClick={() => setBuilding(null)}>{t("common.close")}</Button>}
      >
        <p className="dim">{t("instances.buildHint")}</p>
        <div className="build-state">
          <span>
            {buildState?.running
              ? t("instances.buildRunning")
              : buildState?.ok
                ? t("instances.buildDone")
                : t("instances.buildFailed")}
          </span>
          <ProgressBar
            value={buildState?.ok ? 100 : 0}
            tone={buildState?.running ? "mint" : buildState?.ok ? "blue" : "red"}
            indeterminate={buildState?.running}
          />
        </div>
        <pre className="console console--tall">{buildState?.lines.join("\n") || "…"}</pre>
      </Modal>
    </div>
  );
}
