import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { api } from "../lib/api";
import { useI18n } from "../i18n";
import { useUi } from "../store";

export function TitleBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useI18n();
  const version = useUi((state) => state.env?.appVersion) ?? "0.1.0";
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!api) return;
    void api.windowIsMaximized().then(setMaximized);
    return api.onWindowState(setMaximized);
  }, []);

  return (
    <header className="titlebar">
      <div className="titlebar__brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <b>THorizon</b>
        <span className="titlebar__version">{version}</span>
      </div>
      <div
        className="titlebar__drag"
        onDoubleClick={() => void api?.windowToggleMaximize().then(setMaximized)}
      >
        <span className="titlebar__crumb">{title}</span>
        {subtitle ? <span className="titlebar__sub">{subtitle}</span> : null}
      </div>
      <div className="window-controls">
        <button
          type="button"
          className="window-btn"
          aria-label={t("titlebar.minimize")}
          onClick={() => void api?.windowMinimize()}
        >
          <Icon name="minimize" size={14} />
        </button>
        <button
          type="button"
          className="window-btn"
          aria-label={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
          onClick={() => void api?.windowToggleMaximize().then(setMaximized)}
        >
          <Icon name={maximized ? "restore" : "maximize"} size={12} />
        </button>
        <button
          type="button"
          className="window-btn window-btn--close"
          aria-label={t("titlebar.close")}
          onClick={() => void api?.windowClose()}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    </header>
  );
}
