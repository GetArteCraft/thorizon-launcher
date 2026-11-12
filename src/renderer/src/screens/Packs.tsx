import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../components/Icon";
import {
  Button,
  Chip,
  EmptyState,
  PageHeader,
  Panel,
  Select,
  TextInput,
} from "../components/ui";
import { useI18n } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import {
  categories,
  iconFor,
  packSummary,
  packs,
  projectById,
} from "../lib/data";
import { cn, formatBytes, shortHash } from "../lib/format";
import type { Pack } from "@shared/types";

function matches(pack: Pack, query: string): boolean {
  if (!query) return true;
  const needle = query.toLowerCase();
  const haystack = [
    pack.name,
    pack.summary,
    pack.description,
    ...pack.tags,
    ...pack.categories,
    ...pack.categoryLabels,
    ...pack.mods.map((mod) => mod.id),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function PacksScreen() {
  const { t, locale, number } = useI18n();
  const openDetail = useUi((state) => state.openDetail);
  const toast = useUi((state) => state.pushToast);
  const env = useUi((state) => state.env);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [serverSafe, setServerSafe] = useState(false);
  const [sort, setSort] = useState("featured");

  const categoryList = useMemo(categories, []);

  const list = useMemo(() => {
    const filtered = packs.filter(
      (pack) =>
        matches(pack, query) &&
        (!category || pack.categories.includes(category)) &&
        (!serverSafe || pack.serverSafe),
    );
    switch (sort) {
      case "mods":
        return [...filtered].sort((a, b) => b.requirements.mods - a.requirements.mods);
      case "name":
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case "updated":
        return [...filtered].sort((a, b) => (a.published < b.published ? 1 : -1));
      default:
        return filtered;
    }
  }, [query, category, serverSafe, sort]);

  const install = async (pack: Pack) => {
    if (!api) return;
    if (!env?.cli) {
      toast("error", t("install.noCli"));
      openDetail("pack", pack.id);
      return;
    }
    await api.installStart(pack.id);
  };

  return (
    <div className="screen">
      <PageHeader
        eyebrow={t("nav.group.catalog")}
        title={t("packs.title")}
        lead={t("packs.lead")}
        actions={
          <div className="header-count">
            <b>{number(list.length)}</b>
            <span>{t("packs.showing", { shown: list.length, total: packs.length })}</span>
          </div>
        }
      />

      <div className="filterbar">
        <div className="search-field">
          <Icon name="search" size={16} />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("packs.search")}
            aria-label={t("packs.search")}
          />
        </div>
        <div className="filterbar__right">
          <button
            type="button"
            className={cn("filter-toggle", serverSafe && "is-active")}
            onClick={() => setServerSafe((value) => !value)}
          >
            <Icon name="server" size={14} />
            {t("packs.serverSafe")}
          </button>
          <Select value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t("packs.sort")}>
            <option value="featured">{t("packs.sort.featured")}</option>
            <option value="mods">{t("packs.sort.mods")}</option>
            <option value="name">{t("packs.sort.name")}</option>
            <option value="updated">{t("packs.sort.updated")}</option>
          </Select>
        </div>
      </div>

      <div className="chip-row" role="list" aria-label={t("packs.category")}>
        <button
          type="button"
          className={cn("chip chip--filter", !category && "is-active")}
          onClick={() => setCategory("")}
        >
          {t("common.all")}
        </button>
        {categoryList.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn("chip chip--filter", category === item.id && "is-active")}
            onClick={() => setCategory(category === item.id ? "" : item.id)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="grid"
          title={t("packs.empty")}
          body={t("packs.empty.body")}
          action={
            <Button
              icon="refresh"
              onClick={() => {
                setQuery("");
                setCategory("");
                setServerSafe(false);
              }}
            >
              {t("common.reset")}
            </Button>
          }
        />
      ) : (
        <div className="pack-grid">
          {list.map((pack, index) => (
            <motion.article
              key={pack.id}
              className="pack-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.28 }}
              onClick={() => openDetail("pack", pack.id)}
            >
              <div className="pack-card__top">
                <img className="pack-card__icon" src={iconFor(pack)} alt="" loading="lazy" />
                <div className="pack-card__head">
                  <div className="pack-card__title">
                    <h2>{pack.name}</h2>
                    {pack.id === "better_plus" ? <Chip tone="mint" icon="pin">{t("packs.flagship")}</Chip> : null}
                  </div>
                  <p>{packSummary(pack, locale)}</p>
                </div>
              </div>

              <div className="pack-card__chips">
                <Chip tone="blue" icon="cube">{t("packs.modsCount", { n: pack.requirements.mods })}</Chip>
                <Chip tone={pack.requirements.pins > 2 ? "amber" : "plain"} icon="pin">
                  {t("packs.pinsCount", { n: pack.requirements.pins })}
                </Chip>
                <Chip tone={pack.serverSafe ? "mint" : "amber"} icon="server">
                  {pack.serverSafe ? t("packs.serverSafe.yes") : t("packs.serverSafe.no")}
                </Chip>
              </div>

              <div className="pack-card__foot">
                <span className="dim">
                  {pack.game} · {pack.version}
                </span>
                <div className="pack-card__actions">
                  <Button
                    variant="subtle"
                    size="sm"
                    icon="download"
                    onClick={(event) => {
                      event.stopPropagation();
                      void install(pack);
                    }}
                  >
                    {t("common.install")}
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    iconRight="chevronRight"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDetail("pack", pack.id);
                    }}
                  >
                    {t("packs.details")}
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
}

export function PackDetailScreen() {
  const { t, locale } = useI18n();
  const detail = useUi((state) => state.detail);
  const closeDetail = useUi((state) => state.closeDetail);
  const openDetail = useUi((state) => state.openDetail);
  const env = useUi((state) => state.env);
  const toast = useUi((state) => state.pushToast);
  const [modQuery, setModQuery] = useState("");

  const pack = packs.find((item) => item.id === detail?.id);
  if (!pack) {
    return (
      <div className="screen">
        <EmptyState icon="alert" title={t("pack.notFound")} body={t("packs.empty.body")} action={<Button onClick={closeDetail}>{t("common.back")}</Button>} />
      </div>
    );
  }

  const mods = pack.mods.filter((mod) => {
    if (!modQuery) return true;
    const project = projectById(mod.id);
    return `${mod.id} ${project?.name ?? ""}`.toLowerCase().includes(modQuery.toLowerCase());
  });

  const install = async () => {
    if (!api) return;
    if (!env?.cli) {
      toast("error", t("pack.noCli"));
      return;
    }
    await api.installStart(pack.id);
  };

  const paragraphs = pack.description.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="screen screen--detail">
      <button type="button" className="back-link" onClick={closeDetail}>
        <Icon name="arrowLeft" size={14} />
        <span>{t("common.back")}</span>
      </button>

      <section className="detail-hero">
        <img className="detail-hero__icon" src={iconFor(pack)} alt="" />
        <div className="detail-hero__copy">
          <div className="detail-hero__chips">
            <Chip tone="mint">{pack.version}</Chip>
            {pack.categoryLabels.map((label, index) => (
              <Chip key={label} tone={(["mint", "blue", "violet", "amber"] as const)[index % 4]}>
                {label}
              </Chip>
            ))}
            <Chip tone={pack.serverSafe ? "mint" : "amber"} icon="server">
              {pack.serverSafe ? t("pack.serverSafe") : t("pack.serverUnsafe")}
            </Chip>
          </div>
          <h1 className="display">{pack.name}</h1>
          <p className="lead">{packSummary(pack, locale)}</p>
          <div className="detail-hero__actions">
            <Button variant="primary" size="lg" icon="download" onClick={() => void install()}>
              {t("pack.install")}
            </Button>
            <Button size="lg" icon="external" onClick={() => void api?.openExternal(`https://thorizon.app/packs/${pack.id}`)}>
              {t("pack.openSite")}
            </Button>
          </div>
          {!env?.cli ? <p className="inline-note">{t("pack.noCli")}</p> : null}
        </div>
      </section>

      <div className="detail-stats">
        <div><b>{pack.requirements.mods}</b><span>{t("common.mods")}</span></div>
        <div><b>{pack.requirements.pins}</b><span>{t("common.pins")}</span></div>
        <div><b>{pack.requirements.min_hooks}</b><span>hooks</span></div>
        <div><b>{formatBytes(pack.download.size)}</b><span>{t("common.size")}</span></div>
        <div><b>{pack.requirements.game}</b><span>{t("common.game")}</span></div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <Panel title={t("pack.about")}>
            <div className="prose">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            {pack.requirements.pins >= 2 ? (
              <div className="notice notice--warn">
                <Icon name="alert" size={16} />
                <span>{t("pack.pinsWarn", { n: pack.requirements.pins })}</span>
              </div>
            ) : null}
          </Panel>

          <Panel
            title={t("pack.modsTable")}
            action={
              <div className="search-field search-field--compact">
                <Icon name="search" size={14} />
                <input
                  className="input"
                  value={modQuery}
                  onChange={(event) => setModQuery(event.target.value)}
                  placeholder={t("common.search")}
                  aria-label={t("common.search")}
                />
              </div>
            }
          >
            <div className="mod-table">
              <div className="mod-table__head">
                <span>{t("common.mods")}</span>
                <span>{t("common.version")}</span>
                <span>{t("common.license")}</span>
              </div>
              {mods.map((mod) => {
                const project = projectById(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    className="mod-table__row"
                    onClick={() => project && openDetail("mod", project.id)}
                  >
                    <span className="mod-table__name">
                      <span className="reg-tile reg-tile--sm">{project ? project.name.slice(0, 1) : mod.id.slice(0, 1)}</span>
                      <span>
                        <b>{project?.name ?? mod.id}</b>
                        <em>{mod.id}</em>
                      </span>
                    </span>
                    <span className="mono">{mod.version}</span>
                    <span className="dim">{mod.license}</span>
                  </button>
                );
              })}
            </div>
            <p className="dim small">{t("pack.licenseNote")}</p>
          </Panel>

          <Panel title={t("pack.changelog")}>
            <p className="prose">{pack.changelog}</p>
          </Panel>
        </div>

        <aside className="detail-aside">
          <Panel title={t("pack.requirements")}>
            <dl className="spec-list">
              <div><dt>{t("pack.game")}</dt><dd>{pack.requirements.game}</dd></div>
              <div><dt>{t("common.mods")}</dt><dd>{pack.requirements.mods}</dd></div>
              <div><dt>{t("common.pins")}</dt><dd>{pack.requirements.pins}</dd></div>
              <div><dt>hooks</dt><dd>{pack.requirements.min_hooks}</dd></div>
              <div><dt>{t("pack.analog")}</dt><dd>{pack.analog}</dd></div>
              <div><dt>{t("common.license")}</dt><dd>{pack.license}</dd></div>
              <div><dt>{t("common.source")}</dt><dd>{pack.author}</dd></div>
            </dl>
          </Panel>

          <Panel title={t("pack.download")}>
            <div className="hash-box">
              <code>{pack.download.name}</code>
              <span>{formatBytes(pack.download.size)}</span>
              <code className="hash-box__hash">{pack.download.sha256}</code>
              <span>{shortHash(pack.download.sha256, 16)}</span>
            </div>
          </Panel>

          <Panel title={t("pack.licenses")}>
            <div className="license-list">
              {[...new Set(pack.mods.map((mod) => mod.license))].map((license) => (
                <Chip key={license} tone="plain">{license}</Chip>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
