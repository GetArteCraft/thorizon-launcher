import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  IconButton,
  Modal,
  PageHeader,
  Panel,
  TextInput,
  Toggle,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { packs } from "../lib/data";
import { timeAgo } from "../lib/format";
import type { ServerEntry } from "@shared/types";

export function ServersScreen() {
  const { t, locale } = useI18n();
  const env = useUi((state) => state.env);
  const servers = useUi((state) => state.servers);
  const setServers = useUi((state) => state.setServers);
  const toast = useUi((state) => state.pushToast);
  const consoleServer = useUi((state) => state.consoleServer);
  const consoleLines = useUi((state) => state.consoleLines);
  const setConsole = useUi((state) => state.setConsole);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(25565);
  const [packId, setPackId] = useState("");
  const [whitelist, setWhitelist] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pinging, setPinging] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ServerEntry | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [consoleLines]);

  const running = consoleServer;

  const add = async () => {
    if (!api || !name.trim() || !host.trim()) return;
    setBusy(true);
    try {
      const entry = await api.serversAdd({ name, host, port, packId: packId || null, version: "26.3", whitelist });
      setServers([entry, ...servers]);
      setAdding(false);
      setName("");
      setHost("");
      setPort(25565);
      setPackId("");
      toast("success", t("common.saved"));
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setBusy(false);
    }
  };

  const ping = async (server: ServerEntry) => {
    if (!api) return;
    setPinging(server.id);
    try {
      const next = await api.serversPing(server.id);
      if (next) setServers(servers.map((item) => (item.id === next.id ? next : item)));
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setPinging(null);
    }
  };

  const remove = async () => {
    if (!api || !removing) return;
    try {
      await api.serversRemove(removing.id);
      setServers(servers.filter((server) => server.id !== removing.id));
      setRemoving(null);
    } catch (error) {
      toast("error", errorText(error, locale));
    }
  };

  const start = (server: ServerEntry) => {
    if (!api) return;
    if (!env?.cli) {
      toast("error", t("servers.noCli"));
      return;
    }
    setConsole(server.id, [`Starting ${server.name}…`]);
    void api.serversStart(server.id).catch((error) => toast("error", errorText(error, locale)));
  };

  const stop = () => {
    void api?.serversStop();
  };

  const online = useMemo(() => servers.filter((server) => server.ping?.online).length, [servers]);

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.play")}
        title={t("servers.title")}
        lead={t("servers.lead")}
        actions={
          <div className="filterbar__right">
            <div className="header-count">
              <b>{online}</b>
              <span>/ {servers.length} {t("servers.onlineCount")}</span>
            </div>
            <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
              {t("servers.add")}
            </Button>
          </div>
        }
      />

      {servers.length === 0 ? (
        <EmptyState
          icon="server"
          title={t("servers.empty")}
          body={t("servers.emptyBody")}
          action={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>{t("servers.add")}</Button>}
        />
      ) : (
        <div className="server-list">
          {servers.map((server) => {
            const pack = packs.find((item) => item.id === server.packId);
            const isRunning = running === server.id;
            return (
              <article className={`server-card ${isRunning ? "is-running" : ""}`} key={server.id}>
                <div className="server-card__main">
                  <span className={`server-card__icon ${server.ping?.online ? "is-online" : ""}`}>
                    <Icon name="server" size={18} />
                  </span>
                  <div className="server-card__copy">
                    <div className="server-card__title">
                      <b>{server.name}</b>
                      {server.whitelist ? <Chip tone="mint" icon="shield">whitelist</Chip> : null}
                      {isRunning ? <Chip tone="blue" icon="pulse">{t("servers.start")}</Chip> : null}
                    </div>
                    <span className="mono dim">{server.host}:{server.port}</span>
                    <div className="server-card__meta">
                      <span>{pack?.name ?? server.packId ?? "—"}</span>
                      <span>{server.version}</span>
                      <span>{server.ping ? (server.ping.online ? t("servers.online", { ms: server.ping.latencyMs ?? 0 }) : t("servers.offline")) : t("servers.none")}</span>
                      <span>{server.ping?.checkedAt ? t("servers.checked", { time: timeAgo(server.ping.checkedAt, locale) }) : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="server-card__actions">
                  <Button size="sm" icon="pulse" onClick={() => void ping(server)} disabled={pinging === server.id}>
                    {t("servers.ping")}
                  </Button>
                  {isRunning ? (
                    <Button size="sm" variant="danger" icon="close" onClick={stop}>{t("servers.stop")}</Button>
                  ) : (
                    <Button size="sm" variant="subtle" icon="play" onClick={() => start(server)}>{t("servers.start")}</Button>
                  )}
                  <IconButton icon="trash" label={t("common.remove")} onClick={() => setRemoving(server)} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Panel
        title={t("servers.console")}
        action={running ? <Button size="sm" variant="danger" icon="close" onClick={stop}>{t("servers.stop")}</Button> : undefined}
      >
        {running || consoleLines.length > 0 ? (
          <pre className="console" ref={logRef}>{consoleLines.join("\n") || t("servers.consoleEmpty")}</pre>
        ) : (
          <p className="dim">{t("servers.consoleEmpty")}</p>
        )}
        {!env?.cli ? <p className="dim small">{t("servers.noCli")}</p> : null}
      </Panel>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t("servers.add")}
        footer={
          <>
            <Button onClick={() => setAdding(false)} disabled={busy}>{t("common.cancel")}</Button>
            <Button variant="primary" icon="plus" onClick={() => void add()} disabled={busy || !name.trim() || !host.trim()}>
              {t("common.add")}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <Field label={t("servers.name")}>
            <TextInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Campfire EU" />
          </Field>
          <Field label={t("servers.host")}>
            <TextInput value={host} onChange={(event) => setHost(event.target.value)} placeholder="play.example.com" />
          </Field>
          <Field label={t("servers.port")}>
            <TextInput type="number" value={port} min={1} max={65535} onChange={(event) => setPort(Number(event.target.value))} />
          </Field>
          <Field label={t("servers.pack")}>
            <select className="input select" value={packId} onChange={(event) => setPackId(event.target.value)}>
              <option value="">—</option>
              {packs.filter((pack) => pack.serverSafe).map((pack) => (
                <option key={pack.id} value={pack.id}>{pack.name}</option>
              ))}
            </select>
          </Field>
          <div className="field field--wide setting-inline">
            <span>{t("servers.whitelist")}</span>
            <Toggle checked={whitelist} onChange={setWhitelist} label={t("servers.whitelist")} />
          </div>
        </div>
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("common.remove")}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>{t("common.cancel")}</Button>
            <Button variant="danger" icon="trash" onClick={() => void remove()}>{t("common.remove")}</Button>
          </>
        }
      >
        <p>{removing ? t("servers.removeConfirm", { name: removing.name }) : ""}</p>
      </Modal>
    </div>
  );
}
