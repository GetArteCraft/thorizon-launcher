import { Suspense, lazy, useMemo } from "react";
import { motion } from "framer-motion";
import { Icon, type IconName } from "../components/Icon";
import {
  Button,
  Chip,
  PageHeader,
  Panel,
  ProgressBar,
  StatusDot,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { featuredPack, packs, packSummary, registry, iconFor } from "../lib/data";
import { cn, formatBytes, timeAgo } from "../lib/format";
import type { Profile } from "@shared/types";

const WorldScene = lazy(() => import("../components/WorldScene"));

export function HomeScreen() {
  const { t, locale, number } = useI18n();
  const settings = useUi((state) => state.settings);
  const env = useUi((state) => state.env);
  const profiles = useUi((state) => state.profiles);
  const navigate = useUi((state) => state.navigate);
  const openDetail = useUi((state) => state.openDetail);
  const toast = useUi((state) => state.pushToast);

  const current = useMemo<Profile | undefined>(() => {
    const preferred = settings.defaultProfile
      ? profiles.find((profile) => profile.id === settings.defaultProfile)
      : undefined;
    const played = [...profiles]
      .filter((profile) => profile.lastPlayed)
      .sort((a, b) => (a.lastPlayed! < b.lastPlayed! ? 1 : -1))[0];
    return preferred ?? played ?? profiles[0];
  }, [profiles, settings.defaultProfile]);

  const play = async () => {
    if (!current) {
      navigate("packs");
      return;
    }
    if (!api) return;
    try {
      const result = await api.profilesPlay(current.id);
      if (!result.ok) toast("error", t("instances.playFailed"));
    } catch (error) {
      toast("error", errorText(error, locale));
      if (errorText(error, locale).includes("Horizon")) navigate("instances");
    }
  };

  const install = async (id: string) => {
    if (!api) return;
    if (!env?.cli) {
      toast("error", t("install.noCli"));
      openDetail("pack", id);
      return;
    }
    await api.installStart(id);
  };

  const quick: Array<{ tab: Parameters<typeof navigate>[0]; icon: IconName; title: string; body: string }> = [
    { tab: "packs", icon: "grid", title: t("home.quick.packs"), body: t("home.quick.packsBody") },
    { tab: "library", icon: "library", title: t("home.quick.library"), body: t("home.quick.libraryBody") },
    { tab: "editor", icon: "wand", title: t("home.quick.editor"), body: t("home.quick.editorBody") },
    { tab: "settings", icon: "settings", title: t("home.quick.settings"), body: t("home.quick.settingsBody") },
  ];

  return (
    <div className="screen screen--home">
      <section className="home-hero">
        <div className="home-hero__copy">
          <span className="eyebrow">{t("home.eyebrow")}</span>
          <h1 className="display hero-title">{t("home.title")}</h1>
          <p className="lead">{t("home.lead")}</p>
          <div className="home-hero__actions">
            <Button variant="primary" size="lg" icon="play" onClick={() => void play()}>
              {current ? `${t("home.continue")} · ${current.name}` : t("home.play")}
            </Button>
            <Button size="lg" icon="grid" onClick={() => navigate("packs")}>
              {t("home.seeAll")}
            </Button>
          </div>
          <div className="home-hero__meta">
            <span className={cn("meta-pill", env?.cli && "meta-pill--ok")}>
              <StatusDot state={env?.cli ? "ok" : "warn"} />
              {env?.cli ? t("env.ready", { version: env.cliVersion ?? "" }) : t("env.noCli")}
            </span>
            <span className="meta-pill">
              <Icon name="users" size={13} />
              {env?.account?.name ?? t("env.account.none")}
            </span>
            <span className="meta-pill">
              <Icon name="shield" size={13} />
              {t("legal.requires")}
            </span>
          </div>
        </div>

        <div className="home-hero__scene">
          <div className="home-hero__scene-glow" aria-hidden="true" />
          <Suspense fallback={<div className="scene-skeleton" />}>
            <WorldScene quality={settings.quality} reduced={settings.reducedMotion} />
          </Suspense>
          <div className="scene-badge">
            <span className="scene-badge__dot" />
            <span>{t("home.stat.projects")}</span>
            <b>{number(registry.counts.all)}</b>
          </div>
        </div>
      </section>

      <div className="home-grid">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <Panel title={t("home.continue")} className="panel--continue">
            {current ? (
              <div className="continue-card">
                <img className="continue-card__icon" src={iconFor(packs.find((pack) => pack.id === current.packId))} alt="" />
                <div className="continue-card__copy">
                  <b>{current.name}</b>
                  <span>
                    {current.version} · {t("instances.mods", { n: current.mods })}
                  </span>
                  <span className="dim">
                    {current.lastPlayed ? timeAgo(current.lastPlayed, locale) : t("instances.never")}
                  </span>
                </div>
                <Button variant="primary" icon="play" onClick={() => void play()}>
                  {t("common.play")}
                </Button>
              </div>
            ) : (
              <div className="continue-empty">
                <p>{t("home.noProfiles")}</p>
                <Button variant="primary" icon="grid" onClick={() => navigate("packs")}>
                  {t("home.quick.packs")}
                </Button>
              </div>
            )}
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Panel
            title={t("home.featured")}
            action={<Chip tone="mint" icon="pin">{t("packs.flagship")}</Chip>}
            className="panel--featured"
          >
            <div className="featured-pack">
              <img className="featured-pack__icon" src={iconFor(featuredPack)} alt="" />
              <div className="featured-pack__copy">
                <b>{featuredPack.name}</b>
                <p>{packSummary(featuredPack, locale)}</p>
                <div className="chips">
                  <Chip tone="blue">{t("packs.modsCount", { n: featuredPack.requirements.mods })}</Chip>
                  <Chip tone={featuredPack.serverSafe ? "mint" : "amber"}>
                    {featuredPack.serverSafe ? t("packs.serverSafe.yes") : t("packs.serverSafe.no")}
                  </Chip>
                </div>
              </div>
            </div>
            <div className="featured-pack__actions">
              <Button variant="subtle" icon="download" onClick={() => void install(featuredPack.id)}>
                {t("common.install")}
              </Button>
              <Button variant="link" iconRight="chevronRight" onClick={() => openDetail("pack", featuredPack.id)}>
                {t("packs.details")}
              </Button>
            </div>
          </Panel>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Panel title={t("home.status")} className="panel--status">
            <dl className="status-list">
              <div>
                <dt>{t("home.status.cli")}</dt>
                <dd className={env?.cli ? "is-ok" : "is-warn"}>
                  <StatusDot state={env?.cli ? "ok" : "warn"} />
                  {env?.cli ? env.cliVersion ?? "Horizon" : t("home.status.missing")}
                </dd>
              </div>
              <div>
                <dt>{t("home.status.account")}</dt>
                <dd className={env?.account?.name ? "is-ok" : "is-warn"}>
                  <StatusDot state={env?.account?.name ? "ok" : "warn"} />
                  {env?.account?.name ?? t("env.account.none")}
                </dd>
              </div>
              <div>
                <dt>{t("home.status.game")}</dt>
                <dd>{env?.versions.selected ?? "26.3"}</dd>
              </div>
              <div>
                <dt>{t("diagnostics.profiles")}</dt>
                <dd>{profiles.length}</dd>
              </div>
            </dl>
            <div className="status-progress">
              <span>{t("home.stat.packs")}</span>
              <b>{number(packs.length)}</b>
            </div>
            <ProgressBar value={(packs.length / 20) * 100} />
            <Button variant="link" iconRight="chevronRight" onClick={() => navigate("diagnostics")}>
              {t("nav.diagnostics")}
            </Button>
          </Panel>
        </motion.div>
      </div>

      <div className="home-grid home-grid--two">
        <Panel title={t("home.recent")} action={<Button variant="link" onClick={() => navigate("instances")}>{t("nav.instances")}</Button>}>
          {profiles.length === 0 ? (
            <p className="dim">{t("home.noProfiles")}</p>
          ) : (
            <div className="recent-list">
              {profiles.slice(0, 4).map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className="recent-item"
                  onClick={() => navigate("instances")}
                >
                  <img src={iconFor(packs.find((pack) => pack.id === profile.packId))} alt="" />
                  <span>
                    <b>{profile.name}</b>
                    <em>{profile.lastPlayed ? timeAgo(profile.lastPlayed, locale) : t("instances.never")}</em>
                  </span>
                  <span className="recent-item__size">{formatBytes(profile.sizeBytes)}</span>
                  <Icon name="chevronRight" size={14} />
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t("home.news")}>
          <div className="news-list">
            {[1, 2, 3].map((index) => (
              <div className="news-item" key={index}>
                <span className="news-item__dot" />
                <div>
                  <b>{t(`home.news.${index}.title`)}</b>
                  <p>{t(`home.news.${index}.body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="quick-grid">
        {quick.map((item, index) => (
          <motion.button
            key={item.tab}
            type="button"
            className="quick-card"
            onClick={() => navigate(item.tab)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
          >
            <span className="quick-card__icon">
              <Icon name={item.icon} size={18} />
            </span>
            <b>{item.title}</b>
            <span>{item.body}</span>
            <Icon name="arrowUpRight" size={15} className="quick-card__arrow" />
          </motion.button>
        ))}
      </div>

      <footer className="home-foot">
        <span>{t("home.version", { version: env?.appVersion ?? "0.1.0", electron: env?.electron ?? "" })}</span>
        <span>{t("legal.notAffiliated")}</span>
      </footer>
    </div>
  );
}
