import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  Panel,
  PageHeader,
  Skeleton,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { formatBytes } from "../lib/format";
import type { DiagnosticsSummary, UsageStats } from "@shared/types";

export function DiagnosticsScreen() {
  const { t, locale, date } = useI18n();
  const update = useUi((state) => state.update);
  const setUpdate = useUi((state) => state.setUpdate);
  const toast = useUi((state) => state.pushToast);
  const [summary, setSummary] = useState<DiagnosticsSummary | null>(null);
  const [logSource, setLogSource] = useState<"app" | "cli">("app");
  const [log, setLog] = useState("");
  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState(0);
  const [stats, setStats] = useState<UsageStats | null>(null);

  const load = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const [next, logText] = await Promise.all([
        api.diagnosticsSummary(),
        api.logsRead(logSource, 400),
      ]);
      setSummary(next);
      setLog(logText);
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void api?.cacheSize().then(setCache);
    void api?.stats().then(setStats);
  }, []);

  useEffect(() => {
    if (!api) return;
    setLoading(true);
    void api
      .logsRead(logSource, 400)
      .then(setLog)
      .catch((error) => toast("error", errorText(error, locale)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSource]);

  const save = async () => {
    if (!api) return;
    try {
      const path = await api.diagnosticsSave();
      if (path) toast("success", t("diagnostics.saved", { path }));
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const copy = async () => {
    if (!api) return;
    try {
      const text = await api.diagnosticsCopy();
      await navigator.clipboard.writeText(text);
      toast("success", t("diagnostics.copied"));
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const checkUpdates = async () => {
    if (!api) return;
    setUpdate({ status: "checking" });
    setUpdate(await api.updatesCheck());
  };

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.system")}
        title={t("diagnostics.title")}
        lead={t("diagnostics.lead")}
        actions={
          <div className="filterbar__right">
            <Button icon="refresh" onClick={() => void load()}>{t("diagnostics.refresh")}</Button>
            <Button icon="copy" onClick={() => void copy()}>{t("diagnostics.copy")}</Button>
            <Button variant="primary" icon="download" onClick={() => void save()}>{t("diagnostics.save")}</Button>
          </div>
        }
      />

      {loading && !summary ? (
        <div className="grid-3">
          <Skeleton rows={2} /><Skeleton rows={2} /><Skeleton rows={2} />
        </div>
      ) : (
        <div className="diag-grid">
          <div className="diag-stats">
            <div className="diag-stat">
              <span className="diag-stat__icon"><Icon name="package" size={18} /></span>
              <b>{summary?.app.version ?? "0.1.0"}</b>
              <span>{t("diagnostics.app")}</span>
            </div>
            <div className="diag-stat">
              <span className="diag-stat__icon"><Icon name="cpu" size={18} /></span>
              <b>{summary?.env.cli ? summary.env.cliVersion : "—"}</b>
              <span>{t("diagnostics.cli")}</span>
            </div>
            <div className="diag-stat">
              <span className="diag-stat__icon"><Icon name="play" size={18} /></span>
              <b>{summary?.profiles.length ?? 0}</b>
              <span>{t("diagnostics.profiles")}</span>
            </div>
            <div className="diag-stat">
              <span className="diag-stat__icon"><Icon name="globe" size={18} /></span>
              <b>{summary?.app.platform ?? process.platform}</b>
              <span>{t("diagnostics.platform")}</span>
            </div>
          </div>

          <div className="diag-columns">
            <Panel title={t("diagnostics.environment")}>
              <dl className="spec-list">
                <div><dt>{t("diagnostics.app")}</dt><dd>{summary?.app.version}</dd></div>
                <div><dt>{t("diagnostics.electron")}</dt><dd>{summary?.app.electron}</dd></div>
                <div><dt>{t("diagnostics.node")}</dt><dd>{summary?.app.node}</dd></div>
                <div><dt>{t("diagnostics.platform")}</dt><dd>{summary?.app.platform} · {summary?.app.arch}</dd></div>
                <div><dt>{t("diagnostics.cli")}</dt><dd>{summary?.env.cli ? summary.env.cliVersion : t("env.cliMissing")}</dd></div>
                <div><dt>{t("env.account")}</dt><dd>{summary?.env.account.name ?? t("env.account.none")}</dd></div>
                <div><dt>{t("env.versions")}</dt><dd>{summary?.env.versions.installed.join(", ") || t("env.none")}</dd></div>
              </dl>
              <div className="path-list">
                {Object.entries(summary?.paths ?? {}).map(([key, value]) => (
                  <div className="path-row" key={key}>
                    <span>{key}</span>
                    <code title={value}>{value}</code>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={t("common.open")}
                      onClick={() => void api?.openPath(key as "userData" | "profiles" | "logs" | "cache")}
                    >
                      <Icon name="folder" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="diag-side">
              <Panel title={t("diagnostics.updates")}>
                <div className="update-box__head">
                  <Chip tone={update.status === "ready" ? "mint" : update.status === "error" ? "red" : "plain"}>{update.status}</Chip>
                  <span className="dim">
                    {update.status === "dev" ? t("settings.update.dev") : update.status === "available" ? t("settings.update.available", { version: update.version ?? "" }) : update.status === "ready" ? t("settings.update.ready", { version: update.version ?? "" }) : t("settings.update.none")}
                  </span>
                </div>
                <Button size="sm" icon="refresh" style={{ marginTop: 12 }} onClick={() => void checkUpdates()}>
                  {t("settings.updateCheckNow")}
                </Button>
              </Panel>

              <Panel title={t("diagnostics.telemetry")}>
                <div className="notice">
                  <Icon name="shield" size={16} />
                  <span>{t("diagnostics.telemetryOff")}</span>
                </div>
                <p className="dim small">{t("diagnostics.telemetryFields")}</p>
              </Panel>

              <Panel title={t("settings.cache")}>
                <p className="dim">{t("settings.cacheBody", { size: formatBytes(cache) })}</p>
              </Panel>

              <Panel title={t("diagnostics.stats")}>
                <dl className="spec-list">
                  <div><dt>{t("diagnostics.installs")}</dt><dd>{stats?.installedPacks ?? 0}</dd></div>
                  <div><dt>{t("diagnostics.launches")}</dt><dd>{stats?.launches ?? 0}</dd></div>
                  <div><dt>{t("diagnostics.imports")}</dt><dd>{stats?.imports ?? 0}</dd></div>
                  <div><dt>{t("diagnostics.builds")}</dt><dd>{stats?.nativeBuilds ?? 0}</dd></div>
                </dl>
                <p className="dim small">{t("diagnostics.statsNote")}</p>
              </Panel>
            </div>
          </div>

          <Panel
            title={t("diagnostics.logs")}
            action={
              <div className="segmented">
                <button type="button" className={logSource === "app" ? "is-active" : ""} onClick={() => setLogSource("app")}>
                  {t("diagnostics.logs.app")}
                </button>
                <button type="button" className={logSource === "cli" ? "is-active" : ""} onClick={() => setLogSource("cli")}>
                  {t("diagnostics.logs.game")}
                </button>
              </div>
            }
          >
            <pre className="console console--tall">{log || t("diagnostics.noLogs")}</pre>
            <div className="diagnostics__foot">
              <span className="dim">{summary ? date(summary.generated) : ""}</span>
              <Button size="sm" icon="folder" onClick={() => void api?.logsOpenFolder()}>{t("diagnostics.openLogs")}</Button>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
