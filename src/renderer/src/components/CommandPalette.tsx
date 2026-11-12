import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "./Icon";
import { useUi, type Tab } from "../store";
import { useI18n } from "../i18n";
import { allProjects, packs, packSummary } from "../lib/data";

interface Result {
  key: string;
  label: string;
  hint: string;
  icon: IconName;
  run: () => void;
}

const PAGES: Tab[] = [
  "home",
  "packs",
  "mods",
  "shaders",
  "resourcepacks",
  "servers",
  "instances",
  "library",
  "editor",
  "settings",
  "diagnostics",
];

export function CommandPalette() {
  const { t, locale } = useI18n();
  const open = useUi((state) => state.palette);
  const setOpen = useUi((state) => state.setPalette);
  const navigate = useUi((state) => state.navigate);
  const openDetail = useUi((state) => state.openDetail);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo<Result[]>(() => {
    const needle = query.trim().toLowerCase();
    const pageResults: Result[] = PAGES.map((page): Result => {
      const icons: Record<Tab, IconName> = {
        home: "home",
        packs: "grid",
        mods: "cube",
        shaders: "sparkles",
        resourcepacks: "layers",
        servers: "server",
        instances: "play",
        library: "library",
        editor: "wand",
        settings: "settings",
        diagnostics: "pulse",
      };
      return {
        key: `page-${page}`,
        label: t(`nav.${page}`),
        hint: locale === "ru" ? "Экран" : "Screen",
        icon: icons[page],
        run: () => navigate(page),
      };
    }).filter((result) => !needle || result.label.toLowerCase().includes(needle));

    const packResults: Result[] = packs
      .map((pack) => ({
        key: `pack-${pack.id}`,
        label: pack.name,
        hint: `${t("packs.title")} · ${pack.requirements.mods} ${t("common.mods").toLowerCase()}`,
        icon: "grid" as IconName,
        run: () => openDetail("pack", pack.id),
      }))
      .filter(
        (result) =>
          !needle ||
          result.label.toLowerCase().includes(needle) ||
          packSummary(packs.find((pack) => `pack-${pack.id}` === result.key), locale)
            .toLowerCase()
            .includes(needle),
      );

    const projectResults: Result[] = allProjects
      .map((project) => ({
        key: `project-${project.id}`,
        label: project.name,
        hint:
          project.kind === "shader"
            ? t("shaders.title")
            : project.kind === "resourcepack"
              ? t("rp.title")
              : t("mods.title"),
        icon: project.kind === "shader" ? ("sparkles" as IconName) : ("cube" as IconName),
        run: () =>
          openDetail(
            project.kind === "shader"
              ? "shader"
              : project.kind === "resourcepack"
                ? "resourcepack"
                : "mod",
            project.id,
          ),
      }))
      .filter(
        (result) =>
          !needle ||
          result.label.toLowerCase().includes(needle) ||
          result.hint.toLowerCase().includes(needle),
      );

    return [...pageResults, ...packResults, ...projectResults].slice(0, 40);
  }, [query, locale, t, navigate, openDetail]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((value) => Math.min(results.length - 1, value + 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === "Enter") {
        const result = results[index];
        if (result) {
          result.run();
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, index, setOpen]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay overlay--palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            className="palette"
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={t("palette.title")}
          >
            <div className="palette__input">
              <Icon name="search" size={18} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setIndex(0);
                }}
                placeholder={t("palette.placeholder")}
                aria-label={t("palette.placeholder")}
              />
              <kbd>Esc</kbd>
            </div>
            <div className="palette__list">
              {results.length === 0 ? (
                <div className="palette__empty">{t("palette.noResults")}</div>
              ) : (
                results.map((result, itemIndex) => (
                  <button
                    key={result.key}
                    type="button"
                    className={`palette__item ${itemIndex === index ? "is-active" : ""}`}
                    onMouseEnter={() => setIndex(itemIndex)}
                    onClick={() => {
                      result.run();
                      setOpen(false);
                    }}
                  >
                    <span className="palette__icon">
                      <Icon name={result.icon} size={16} />
                    </span>
                    <span className="palette__label">{result.label}</span>
                    <span className="palette__hint">{result.hint}</span>
                  </button>
                ))
              )}
            </div>
            <div className="palette__foot">{t("palette.hint")}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
