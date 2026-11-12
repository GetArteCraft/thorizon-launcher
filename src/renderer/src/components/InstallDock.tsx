import { AnimatePresence, motion } from "framer-motion";
import { useUi } from "../store";
import { useI18n } from "../i18n";
import { packs } from "../lib/data";
import { IconButton, ProgressBar } from "./ui";
import { cn } from "../lib/format";

const PHASES = ["queued", "resolving", "downloading", "verifying", "native", "done", "error"] as const;

export function InstallDock() {
  const { t } = useI18n();
  const installs = useUi((state) => state.installs);
  const clear = useUi((state) => state.clearInstall);
  const navigate = useUi((state) => state.navigate);

  const list = Object.values(installs);
  if (list.length === 0) return null;

  return (
    <div className="install-dock">
      <AnimatePresence>
        {list.slice(-3).map((install) => {
          const pack = packs.find((item) => item.id === install.id);
          const name = pack?.name ?? install.id;
          const active = install.phase !== "done" && install.phase !== "error";
          return (
            <motion.div
              key={install.id}
              className={cn(
                "install-card",
                install.phase === "done" && "install-card--done",
                install.phase === "error" && "install-card--error",
              )}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <div className="install-card__head">
                <span className="install-card__title">{name}</span>
                <IconButton icon="close" label={t("common.close")} onClick={() => clear(install.id)} />
              </div>
              <div className="install-card__stage">
                <span>{t(`install.${install.phase}`)}</span>
                <span>{active ? `${Math.round(install.percent)}%` : ""}</span>
              </div>
              <ProgressBar
                value={install.percent}
                tone={install.phase === "error" ? "red" : install.phase === "done" ? "blue" : "mint"}
                indeterminate={install.phase === "resolving"}
              />
              {install.line ? <div className="install-card__line">{install.line}</div> : null}
              {install.phase === "done" ? (
                <div className="install-card__actions">
                  <button type="button" className="btn btn--subtle btn--sm" onClick={() => navigate("instances")}>
                    {t("install.open")}
                  </button>
                </div>
              ) : null}
              {install.phase === "error" ? (
                <div className="install-card__error">{install.message}</div>
              ) : null}
              {active ? (
                <button
                  type="button"
                  className="install-card__cancel"
                  onClick={() => void window.api?.installCancel()}
                >
                  {t("install.cancel")}
                </button>
              ) : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
