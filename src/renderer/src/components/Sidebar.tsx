import { Icon, type IconName } from "./Icon";
import { LOCALES, useI18n, type Locale } from "../i18n";
import { useUi, type Tab } from "../store";
import { catalog, registry, packs } from "../lib/data";
import { cn } from "../lib/format";
import { Select, StatusDot } from "./ui";

const GROUPS: Array<{ key: string; items: Array<{ id: Tab; icon: IconName; count?: number }> }> = [
  {
    key: "nav.group.play",
    items: [
      { id: "home", icon: "home" },
      { id: "instances", icon: "play" },
      { id: "servers", icon: "server" },
    ],
  },
  {
    key: "nav.group.catalog",
    items: [
      { id: "packs", icon: "grid", count: 20 },
      { id: "mods", icon: "cube", count: 144 },
      { id: "shaders", icon: "sparkles", count: 12 },
      { id: "resourcepacks", icon: "layers", count: 2 },
    ],
  },
  {
    key: "nav.group.system",
    items: [
      { id: "library", icon: "library" },
      { id: "editor", icon: "wand" },
      { id: "settings", icon: "settings" },
      { id: "diagnostics", icon: "pulse" },
    ],
  },
];

export function Sidebar() {
  const { t, locale } = useI18n();
  const tab = useUi((state) => state.tab);
  const navigate = useUi((state) => state.navigate);
  const settings = useUi((state) => state.settings);
  const setSettings = useUi((state) => state.setSettings);
  const env = useUi((state) => state.env);
  const profiles = useUi((state) => state.profiles);

  const changeLanguage = async (value: string) => {
    if (!window.api) return;
    const next = await window.api.settingsSet({ language: value });
    setSettings(next);
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav" aria-label="Main">
        {GROUPS.map((group) => (
          <div className="nav-group" key={group.key}>
            <span className="nav-group__label">{t(group.key)}</span>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("nav-item", tab === item.id && "nav-item--active")}
                data-tab={item.id}
                aria-current={tab === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <span className="nav-item__icon">
                  <Icon name={item.icon} size={17} />
                </span>
                <span className="nav-item__label">{t(`nav.${item.id}`)}</span>
                {item.count ? <span className="nav-item__count">{item.count}</span> : null}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__foot">
        <div className={cn("env-card", env?.cli ? "env-card--ok" : "env-card--warn")}>
          <div className="env-card__head">
            <StatusDot state={env?.cli ? "ok" : "warn"} />
            <b>{env?.cli ? t("env.ready", { version: env.cliVersion ?? "" }) : t("env.noCli")}</b>
          </div>
          <span className="env-card__line">
            {env?.account?.name ?? t("env.account.none")}
          </span>
          <span className="env-card__line">
            {profiles.length > 0
              ? `${profiles.length} ${locale === "ru" ? "профилей" : profiles.length === 1 ? "profile" : "profiles"}`
              : t("env.none")}
          </span>
        </div>

        <div className="sidebar__tools">
          <Select
            aria-label={t("settings.language")}
            value={settings.language}
            onChange={(event) => void changeLanguage(event.target.value)}
          >
            <option value="auto">{t("settings.language.auto")}</option>
            {LOCALES.map((item) => (
              <option key={item.id} value={item.id satisfies Locale}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="sidebar__legal" title={t("legal.notAffiliated")}>
          {catalog.brand.name} · {registry.counts.all} {t("home.stat.projects")}
        </div>
      </div>
    </aside>
  );
}
