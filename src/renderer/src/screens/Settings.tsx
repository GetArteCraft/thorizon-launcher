import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  Field,
  Modal,
  PageHeader,
  Panel,
  Range,
  Select,
  SettingRow,
  TextInput,
  Toggle,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { formatBytes } from "../lib/format";
import type { Settings } from "@shared/types";

type Section =
  | "appearance"
  | "window"
  | "startup"
  | "updates"
  | "graphics"
  | "launch"
  | "files"
  | "servers"
  | "privacy"
  | "advanced";

const SECTIONS: Array<{ id: Section; icon: Parameters<typeof Icon>[0]["name"] }> = [
  { id: "appearance", icon: "sun" },
  { id: "window", icon: "monitor" },
  { id: "startup", icon: "zap" },
  { id: "updates", icon: "refresh" },
  { id: "graphics", icon: "cpu" },
  { id: "launch", icon: "play" },
  { id: "files", icon: "folder" },
  { id: "servers", icon: "server" },
  { id: "privacy", icon: "shield" },
  { id: "advanced", icon: "settings" },
];

export function SettingsScreen() {
  const { t, locale, date } = useI18n();
  const settings = useUi((state) => state.settings);
  const setSettings = useUi((state) => state.setSettings);
  const profiles = useUi((state) => state.profiles);
  const env = useUi((state) => state.env);
  const setEnv = useUi((state) => state.setEnv);
  const update = useUi((state) => state.update);
  const setUpdate = useUi((state) => state.setUpdate);
  const toast = useUi((state) => state.pushToast);

  const [section, setSection] = useState<Section>("appearance");
  const [saved, setSaved] = useState(false);
  const [cache, setCache] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  const [cliDraft, setCliDraft] = useState(settings.cliPath);
  const [profilesDraft, setProfilesDraft] = useState(settings.profilesDir);
  const [catalogDraft, setCatalogDraft] = useState(settings.catalogIndexUrl);
  const [argsError, setArgsError] = useState("");

  useEffect(() => {
    setCliDraft(settings.cliPath);
    setProfilesDraft(settings.profilesDir);
    setCatalogDraft(settings.catalogIndexUrl);
  }, [settings.cliPath, settings.profilesDir, settings.catalogIndexUrl]);

  useEffect(() => {
    void api?.cacheSize().then(setCache);
  }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!api) return;
    try {
      const next = await api.settingsSet(patch);
      setSettings(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const checkUpdates = async () => {
    if (!api) return;
    setUpdate({ status: "checking" });
    setUpdate(await api.updatesCheck());
  };

  const clearCache = async () => {
    if (!api) return;
    await api.cacheClear();
    setCache(await api.cacheSize());
    toast("success", t("settings.clearCache"));
  };

  const reset = async () => {
    if (!api) return;
    const next = await api.settingsReset();
    setSettings(next);
    setResetOpen(false);
    toast("success", t("settings.reset"));
  };

  const chooseCli = async () => {
    if (!api) return;
    const next = await api.pickCli();
    if (next) setEnv(next);
  };

  return (
    <div className="screen settings-screen">
      <PageHeader
        eyebrow={t("nav.group.system")}
        title={t("settings.title")}
        lead={t("settings.lead")}
        actions={saved ? <span className="saved-pill"><Icon name="check" size={13} />{t("common.saved")}</span> : undefined}
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label={t("settings.title")}>
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`settings-nav__item ${section === item.id ? "is-active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              <Icon name={item.icon} size={16} />
              <span>{t(`settings.section.${item.id}`)}</span>
            </button>
          ))}
        </nav>

        <div className="settings-body">
          {section === "appearance" ? (
            <Panel title={t("settings.section.appearance")}>
              <SettingRow title={t("settings.language")}>
                <Select value={settings.language} onChange={(event) => void save({ language: event.target.value })}>
                  <option value="auto">{t("settings.language.auto")}</option>
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                </Select>
              </SettingRow>
              <SettingRow title={t("settings.theme")}>
                <div className="segmented">
                  <button type="button" className={settings.theme === "dark" ? "is-active" : ""} onClick={() => void save({ theme: "dark" })}>
                    <Icon name="moon" size={13} /> {t("settings.theme.dark")}
                  </button>
                  <button type="button" className={settings.theme === "light" ? "is-active" : ""} onClick={() => void save({ theme: "light" })}>
                    <Icon name="sun" size={13} /> {t("settings.theme.light")}
                  </button>
                </div>
              </SettingRow>
              <SettingRow title={t("settings.sounds")} body={t("settings.soundsBody")}>
                <Toggle checked={settings.sounds} onChange={(value) => void save({ sounds: value })} label={t("settings.sounds")} />
              </SettingRow>
              <SettingRow title={t("settings.volume")}>
                <div className="range-row">
                  <Range value={Math.round(settings.soundVolume * 100)} min={0} max={100} onChange={(value) => void save({ soundVolume: value / 100 })} label={t("settings.volume")} />
                  <span className="mono">{Math.round(settings.soundVolume * 100)}%</span>
                </div>
              </SettingRow>
              <SettingRow title={t("settings.reducedMotion")}>
                <Toggle checked={settings.reducedMotion} onChange={(value) => void save({ reducedMotion: value })} label={t("settings.reducedMotion")} />
              </SettingRow>
              <SettingRow title={t("settings.quality")}>
                <Select value={settings.quality} onChange={(event) => void save({ quality: event.target.value as Settings["quality"] })}>
                  <option value="auto">{t("settings.quality.auto")}</option>
                  <option value="high">{t("settings.quality.high")}</option>
                  <option value="low">{t("settings.quality.low")}</option>
                  <option value="off">{t("settings.quality.off")}</option>
                </Select>
              </SettingRow>
            </Panel>
          ) : null}

          {section === "window" ? (
            <Panel title={t("settings.section.window")}>
              <SettingRow title={t("settings.closeToTray")} body={t("settings.closeToTrayBody")}>
                <Toggle checked={settings.closeToTray} onChange={(value) => void save({ closeToTray: value })} label={t("settings.closeToTray")} />
              </SettingRow>
              <SettingRow title={t("settings.minimizeToTray")}>
                <Toggle checked={settings.minimizeToTray} onChange={(value) => void save({ minimizeToTray: value })} label={t("settings.minimizeToTray")} />
              </SettingRow>
              <SettingRow title={t("settings.startMinimized")}>
                <Toggle checked={settings.startMinimized} onChange={(value) => void save({ startMinimized: value })} label={t("settings.startMinimized")} />
              </SettingRow>
              <SettingRow title={t("settings.trayNotifications")}>
                <Toggle checked={settings.trayNotifications} onChange={(value) => void save({ trayNotifications: value })} label={t("settings.trayNotifications")} />
              </SettingRow>
              <SettingRow title={t("settings.singleInstance")}>
                <Toggle checked={settings.singleInstance} onChange={(value) => void save({ singleInstance: value })} label={t("settings.singleInstance")} />
              </SettingRow>
              <SettingRow title={t("settings.rememberWindow")}>
                <Toggle checked={settings.rememberWindow} onChange={(value) => void save({ rememberWindow: value })} label={t("settings.rememberWindow")} />
              </SettingRow>
            </Panel>
          ) : null}

          {section === "startup" ? (
            <Panel title={t("settings.section.startup")}>
              <SettingRow title={t("settings.autostart")}>
                <Toggle checked={settings.autostart} onChange={(value) => void save({ autostart: value })} label={t("settings.autostart")} />
              </SettingRow>
              <SettingRow title={t("settings.autostartMinimized")}>
                <Toggle checked={settings.autostartMinimized} onChange={(value) => void save({ autostartMinimized: value })} label={t("settings.autostartMinimized")} />
              </SettingRow>
              <SettingRow title={t("settings.autostartOnBattery")}>
                <Toggle checked={settings.autostartOnBattery} onChange={(value) => void save({ autostartOnBattery: value })} label={t("settings.autostartOnBattery")} />
              </SettingRow>
              <SettingRow title={t("settings.autostartServer")}>
                <Toggle checked={settings.autostartServer} onChange={(value) => void save({ autostartServer: value })} label={t("settings.autostartServer")} />
              </SettingRow>
              <SettingRow title={t("settings.launchGameOnStart")}>
                <Toggle checked={settings.launchGameOnStart} onChange={(value) => void save({ launchGameOnStart: value })} label={t("settings.launchGameOnStart")} />
              </SettingRow>
            </Panel>
          ) : null}

          {section === "updates" ? (
            <Panel title={t("settings.section.updates")}>
              <SettingRow title={t("settings.updateChannel")}>
                <Select value={settings.updateChannel} onChange={(event) => void save({ updateChannel: event.target.value as Settings["updateChannel"] })}>
                  <option value="stable">{t("settings.updateChannel.stable")}</option>
                  <option value="beta">{t("settings.updateChannel.beta")}</option>
                </Select>
              </SettingRow>
              <SettingRow title={t("settings.updateCheck")}>
                <TextInput
                  type="number"
                  min={1}
                  max={48}
                  value={settings.updateCheckHours}
                  onChange={(event) => void save({ updateCheckHours: Number(event.target.value) })}
                />
              </SettingRow>
              <SettingRow title={t("settings.updateAutoDownload")}>
                <Toggle checked={settings.updateAutoDownload} onChange={(value) => void save({ updateAutoDownload: value })} label={t("settings.updateAutoDownload")} />
              </SettingRow>
              <SettingRow title={t("settings.updateInstallOnExit")}>
                <Toggle checked={settings.updateInstallOnExit} onChange={(value) => void save({ updateInstallOnExit: value })} label={t("settings.updateInstallOnExit")} />
              </SettingRow>
              <div className="update-box">
                <div className="update-box__head">
                  <Chip tone={update.status === "available" || update.status === "ready" ? "mint" : update.status === "error" ? "red" : "plain"}>
                    {update.status}
                  </Chip>
                  <span className="dim">
                    {update.status === "dev"
                      ? t("settings.update.dev")
                      : update.status === "available"
                        ? t("settings.update.available", { version: update.version ?? "" })
                        : update.status === "ready"
                          ? t("settings.update.ready", { version: update.version ?? "" })
                          : update.status === "downloading"
                            ? t("settings.update.downloading", { percent: update.percent ?? 0 })
                            : update.status === "checking"
                              ? t("settings.update.checking")
                              : t("settings.update.none")}
                  </span>
                </div>
                <div className="update-box__actions">
                  <Button size="sm" icon="refresh" onClick={() => void checkUpdates()}>{t("settings.updateCheckNow")}</Button>
                  {update.status === "available" ? (
                    <Button size="sm" variant="primary" icon="download" onClick={() => void api?.updatesDownload()}>{t("settings.update.download")}</Button>
                  ) : null}
                  {update.status === "ready" ? (
                    <Button size="sm" variant="primary" icon="check" onClick={() => void api?.updatesInstall()}>{t("settings.update.install")}</Button>
                  ) : null}
                </div>
              </div>
              <p className="dim small">{t("settings.update.dev")}</p>
            </Panel>
          ) : null}

          {section === "graphics" ? (
            <Panel title={t("settings.section.graphics")}>
              <SettingRow title={t("settings.hardwareAcceleration")} body={t("settings.hardwareAccelerationBody")}>
                <Toggle checked={settings.hardwareAcceleration} onChange={(value) => void save({ hardwareAcceleration: value })} label={t("settings.hardwareAcceleration")} />
              </SettingRow>
              <SettingRow title={t("settings.parallelDownloads")}>
                <div className="range-row">
                  <Range value={settings.parallelDownloads} min={1} max={8} onChange={(value) => void save({ parallelDownloads: value })} label={t("settings.parallelDownloads")} />
                  <span className="mono">{settings.parallelDownloads}</span>
                </div>
              </SettingRow>
              <SettingRow title={t("settings.speedLimit")}>
                <TextInput
                  type="number"
                  min={0}
                  step={64}
                  value={settings.speedLimitKbps}
                  onChange={(event) => void save({ speedLimitKbps: Number(event.target.value) })}
                />
              </SettingRow>
              <SettingRow title={t("settings.cache")} body={t("settings.cacheBody", { size: formatBytes(cache) })}>
                <Button size="sm" icon="trash" onClick={() => void clearCache()}>{t("settings.clearCache")}</Button>
              </SettingRow>
            </Panel>
          ) : null}

          {section === "launch" ? (
            <Panel title={t("settings.section.launch")}>
              <SettingRow title={t("settings.launchMode")}>
                <Select value={settings.launchMode} onChange={(event) => void save({ launchMode: event.target.value as Settings["launchMode"] })}>
                  <option value="windowed">{t("settings.launchMode.windowed")}</option>
                  <option value="borderless">{t("settings.launchMode.borderless")}</option>
                  <option value="fullscreen">{t("settings.launchMode.fullscreen")}</option>
                </Select>
              </SettingRow>
              <SettingRow title={`${t("settings.launchWidth")} × ${t("settings.launchHeight")}`}>
                <div className="pair">
                  <TextInput type="number" min={640} max={7680} value={settings.launchWidth} onChange={(event) => void save({ launchWidth: Number(event.target.value) })} />
                  <span className="dim">×</span>
                  <TextInput type="number" min={480} max={4320} value={settings.launchHeight} onChange={(event) => void save({ launchHeight: Number(event.target.value) })} />
                </div>
              </SettingRow>
              <SettingRow title={t("settings.launchArgs")} body={t("settings.launchArgsBody")}>
                <TextInput
                  value={settings.launchArgs}
                  onChange={(event) => {
                    const value = event.target.value;
                    setArgsError(/["%]/.test(value) ? t("settings.invalidArgs") : "");
                    if (!/["%]/.test(value)) void save({ launchArgs: value });
                  }}
                  placeholder="—"
                  className={argsError ? "input--error" : ""}
                />
              </SettingRow>
              {argsError ? <p className="form-error">{argsError}</p> : null}
              <SettingRow title={t("settings.defaultProfile")}>
                <Select value={settings.defaultProfile ?? ""} onChange={(event) => void save({ defaultProfile: event.target.value || null })}>
                  <option value="">—</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </Select>
              </SettingRow>
              <SettingRow title={t("settings.hideLauncherOnPlay")}>
                <Toggle checked={settings.hideLauncherOnPlay} onChange={(value) => void save({ hideLauncherOnPlay: value })} label={t("settings.hideLauncherOnPlay")} />
              </SettingRow>
            </Panel>
          ) : null}

          {section === "files" ? (
            <Panel title={t("settings.section.files")}>
              <Field label={t("settings.profilesDir")} hint={t("settings.profilesDirBody")}>
                <div className="pair">
                  <TextInput
                    value={profilesDraft}
                    onChange={(event) => setProfilesDraft(event.target.value)}
                    onBlur={() => void save({ profilesDir: profilesDraft })}
                    placeholder={env?.paths.profiles ?? ""}
                  />
                  <Button size="sm" icon="folder" onClick={() => void api?.openPath("profiles")}>{t("common.open")}</Button>
                </div>
              </Field>
              <SettingRow title={t("settings.autoBackup")}>
                <Toggle checked={settings.autoBackup} onChange={(value) => void save({ autoBackup: value })} label={t("settings.autoBackup")} />
              </SettingRow>
              <SettingRow title={t("settings.backupEvery")}>
                <TextInput type="number" min={5} max={240} value={settings.backupEveryMin} onChange={(event) => void save({ backupEveryMin: Number(event.target.value) })} />
              </SettingRow>
              <SettingRow title={t("settings.backupsToKeep")}>
                <TextInput type="number" min={1} max={50} value={settings.backupsToKeep} onChange={(event) => void save({ backupsToKeep: Number(event.target.value) })} />
              </SettingRow>
              <SettingRow title={t("settings.importLimit")}>
                <TextInput type="number" min={1} max={4096} value={settings.importLimitMb} onChange={(event) => void save({ importLimitMb: Number(event.target.value) })} />
              </SettingRow>
            </Panel>
          ) : null}

          {section === "servers" ? (
            <Panel title={t("settings.section.servers")}>
              <SettingRow title={t("settings.upnp")} body={t("settings.upnpBody")}>
                <Toggle checked={settings.upnp} onChange={(value) => void save({ upnp: value })} label={t("settings.upnp")} />
              </SettingRow>
              <SettingRow title={t("settings.portRange")}>
                <div className="pair">
                  <TextInput type="number" min={1024} max={65535} value={settings.portFrom} onChange={(event) => void save({ portFrom: Number(event.target.value) })} />
                  <span className="dim">—</span>
                  <TextInput type="number" min={1024} max={65535} value={settings.portTo} onChange={(event) => void save({ portTo: Number(event.target.value) })} />
                </div>
              </SettingRow>
              <SettingRow title={t("settings.whitelist")}>
                <Toggle checked={settings.whitelist} onChange={(value) => void save({ whitelist: value })} label={t("settings.whitelist")} />
              </SettingRow>
              <SettingRow title={t("settings.serverConsole")}>
                <Toggle checked={settings.serverConsole} onChange={(value) => void save({ serverConsole: value })} label={t("settings.serverConsole")} />
              </SettingRow>
            </Panel>
          ) : null}

          {section === "privacy" ? (
            <Panel title={t("settings.section.privacy")}>
              <SettingRow title={t("settings.telemetry")} body={t("settings.telemetryBody")}>
                <Toggle checked={settings.telemetryEnabled} onChange={(value) => void save({ telemetryEnabled: value })} label={t("settings.telemetry")} />
              </SettingRow>
              <SettingRow title={t("settings.crashReports")} body={t("settings.crashReportsBody")}>
                <Toggle checked={settings.crashReports} onChange={(value) => void save({ crashReports: value })} label={t("settings.crashReports")} />
              </SettingRow>
              <SettingRow title={t("settings.logLevel")}>
                <Select value={settings.logLevel} onChange={(event) => void save({ logLevel: event.target.value as Settings["logLevel"] })}>
                  <option value="error">error</option>
                  <option value="warn">warn</option>
                  <option value="info">info</option>
                  <option value="debug">debug</option>
                </Select>
              </SettingRow>
              <div className="notice">
                <Icon name="shield" size={16} />
                <span>{settings.telemetryEnabled ? t("diagnostics.telemetryFields") : t("diagnostics.telemetryOff")}</span>
              </div>
            </Panel>
          ) : null}

          {section === "advanced" ? (
            <Panel title={t("settings.section.advanced")}>
              <Field label={t("settings.cliPath")} hint={t("settings.cliPathBody")}>
                <div className="pair">
                  <TextInput value={cliDraft} onChange={(event) => setCliDraft(event.target.value)} onBlur={() => void save({ cliPath: cliDraft })} className="mono" />
                  <Button size="sm" icon="folder" onClick={() => void chooseCli()}>{t("env.pickCli")}</Button>
                  <Button size="sm" icon="refresh" onClick={() => void api?.checkEnv().then((next) => setEnv(next))}>{t("common.check")}</Button>
                </div>
              </Field>
              <Field label={t("settings.catalogIndex")} hint={t("settings.catalogIndexBody")}>
                <TextInput value={catalogDraft} onChange={(event) => setCatalogDraft(event.target.value)} onBlur={() => void save({ catalogIndexUrl: catalogDraft })} placeholder="https://thorizon.app/catalog/index.json" />
              </Field>
              <div className="spec-list">
                <div><dt>{t("diagnostics.cli")}</dt><dd>{env?.cli ? env.cliVersion : t("env.cliMissing")}</dd></div>
                <div><dt>{t("diagnostics.app")}</dt><dd>{env?.appVersion}</dd></div>
                <div><dt>{t("diagnostics.platform")}</dt><dd>{env?.os} · {env?.arch}</dd></div>
                <div><dt>{t("settings.cache")}</dt><dd>{formatBytes(cache)}</dd></div>
              </div>
              <div className="danger-zone">
                <div>
                  <b>{t("settings.reset")}</b>
                  <span className="dim">{t("settings.resetBody")}</span>
                </div>
                <Button variant="danger" icon="trash" onClick={() => setResetOpen(true)}>{t("common.reset")}</Button>
              </div>
              <p className="dim small">{t("legal.notAffiliated")}</p>
            </Panel>
          ) : null}
        </div>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("settings.reset")}
        footer={
          <>
            <Button onClick={() => setResetOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="danger" icon="trash" onClick={() => void reset()}>{t("common.reset")}</Button>
          </>
        }
      >
        <p>{t("settings.resetBody")}</p>
      </Modal>

      <p className="dim small settings-foot">{date(new Date())} · {t("home.version", { version: env?.appVersion ?? "0.1.0", electron: env?.electron ?? "" })}</p>
    </div>
  );
}
