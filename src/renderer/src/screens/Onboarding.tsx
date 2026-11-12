import { Suspense, lazy, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../components/Icon";
import { Button, Chip, StatusDot, Toggle } from "../components/ui";
import { useI18n, LOCALES, type Locale } from "../i18n";
import { useUi } from "../store";
import { api, errorText } from "../lib/api";
import { cn } from "../lib/format";

const WorldScene = lazy(() => import("../components/WorldScene"));

const STEPS = 4;

export function Onboarding() {
  const { t, locale } = useI18n();
  const settings = useUi((state) => state.settings);
  const setSettings = useUi((state) => state.setSettings);
  const env = useUi((state) => state.env);
  const setEnv = useUi((state) => state.setEnv);
  const setOnboarding = useUi((state) => state.setOnboarding);
  const navigate = useUi((state) => state.navigate);
  const toast = useUi((state) => state.pushToast);

  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const save = async (patch: Parameters<NonNullable<typeof api>["settingsSet"]>[0]) => {
    if (!api) return;
    const next = await api.settingsSet(patch);
    setSettings(next);
  };

  const finish = async () => {
    await save({ dismissedOnboarding: true });
    setOnboarding(false);
    navigate("home");
  };

  const skip = finish;

  const recheck = async () => {
    if (!api) return;
    setChecking(true);
    try {
      setEnv(await api.checkEnv());
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setChecking(false);
    }
  };

  const locate = async () => {
    if (!api) return;
    setChecking(true);
    try {
      const next = await api.pickCli();
      if (next) setEnv(next);
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setChecking(false);
    }
  };

  const signIn = async () => {
    if (!api) return;
    setSigningIn(true);
    try {
      const result = await api.signIn();
      if (!result.ok) toast("error", result.error === "E_NO_CLI" ? t("env.noCli") : result.stderr || t("env.account.none"));
      await recheck();
    } catch (error) {
      toast("error", errorText(error, locale));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding__scene" aria-hidden="true">
        <Suspense fallback={null}>
          <WorldScene quality={settings.quality} reduced={settings.reducedMotion} />
        </Suspense>
      </div>
      <div className="onboarding__veil" aria-hidden="true" />

      <header className="onboarding__top">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <b>THorizon</b>
        </div>
        <button type="button" className="link-btn" onClick={() => void skip()}>
          {t("common.skip")}
          <Icon name="chevronRight" size={14} />
        </button>
      </header>

      <div className="onboarding__grid">
        <div className="onboarding__copy">
          <span className="eyebrow">{t("onboarding.welcome.eyebrow")}</span>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="display">
                {step === 0 && t("onboarding.welcome.title")}
                {step === 1 && t("onboarding.env.title")}
                {step === 2 && t("onboarding.account.title")}
                {step === 3 && t("onboarding.look.title")}
              </h1>
              <p className="lead">
                {step === 0 && t("onboarding.welcome.body")}
                {step === 1 && t("onboarding.env.body")}
                {step === 2 && t("onboarding.account.body")}
                {step === 3 && t("onboarding.look.body")}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="onboarding__steps" aria-label={t("onboarding.step", { current: step + 1, total: STEPS })}>
            {Array.from({ length: STEPS }).map((_, index) => (
              <span
                key={index}
                className={cn("onboarding__step", index === step && "is-active", index < step && "is-done")}
              />
            ))}
          </div>
        </div>

        <div className="onboarding__panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="onboarding__card"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {step === 0 ? (
                <>
                  <div className="onboarding__badge">
                    <Icon name="sparkles" size={20} />
                  </div>
                  <h2>{t("onboarding.welcome.title")}</h2>
                  <ul className="onboarding__list">
                    <li><Icon name="grid" size={15} />{t("packs.lead")}</li>
                    <li><Icon name="shield" size={15} />{t("legal.requires")}</li>
                    <li><Icon name="library" size={15} />{t("library.lead")}</li>
                  </ul>
                </>
              ) : null}

              {step === 1 ? (
                <>
                  <div className={cn("env-state", env?.cli ? "env-state--ok" : "env-state--warn")}>
                    <StatusDot state={env?.cli ? "ok" : "warn"} />
                    <div>
                      <b>{env?.cli ? t("onboarding.env.found") : t("onboarding.env.missing")}</b>
                      <span>{env?.cli ? `${env.cliVersion ?? "Horizon"} · ${env.cliPath}` : t("env.noCliBody")}</span>
                    </div>
                  </div>
                  <div className="onboarding__actions">
                    <Button variant="primary" icon="external" onClick={() => void api?.openExternal("https://playhorizon.dev")}>
                      {t("onboarding.env.install")}
                    </Button>
                    <Button icon="folder" onClick={() => void locate()} disabled={checking}>
                      {t("onboarding.env.locate")}
                    </Button>
                    <Button icon="refresh" onClick={() => void recheck()} disabled={checking}>
                      {t("onboarding.env.recheck")}
                    </Button>
                  </div>
                  <p className="dim">{t("onboarding.env.body")}</p>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className={cn("env-state", env?.account?.name ? "env-state--ok" : "env-state--warn")}>
                    <StatusDot state={env?.account?.name ? "ok" : "warn"} />
                    <div>
                      <b>{env?.account?.name ? t("onboarding.account.name", { name: env.account.name }) : t("onboarding.account.none")}</b>
                      <span>{env?.account?.ownsJava ? t("env.account.owned") : t("env.account.unknown")}</span>
                    </div>
                  </div>
                  <div className="onboarding__actions">
                    <Button variant="primary" icon="users" onClick={() => void signIn()} disabled={!env?.cli || signingIn}>
                      {t("onboarding.account.signIn")}
                    </Button>
                  </div>
                  <p className="dim">{t("onboarding.account.hint")}</p>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div className="onboarding__field">
                    <span>{t("onboarding.look.language")}</span>
                    <div className="segmented">
                      <button
                        type="button"
                        className={cn(settings.language === "auto" && "is-active")}
                        onClick={() => void save({ language: "auto" })}
                      >
                        {t("settings.language.auto")}
                      </button>
                      {LOCALES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(settings.language === item.id && "is-active")}
                          onClick={() => void save({ language: item.id satisfies Locale })}
                        >
                          {item.short}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="onboarding__field">
                    <span>{t("onboarding.look.theme")}</span>
                    <div className="theme-cards">
                      <button
                        type="button"
                        className={cn("theme-card theme-card--dark", settings.theme === "dark" && "is-active")}
                        onClick={() => void save({ theme: "dark" })}
                      >
                        <Icon name="moon" size={18} />
                        <span>{t("onboarding.look.dark")}</span>
                      </button>
                      <button
                        type="button"
                        className={cn("theme-card theme-card--light", settings.theme === "light" && "is-active")}
                        onClick={() => void save({ theme: "light" })}
                      >
                        <Icon name="sun" size={18} />
                        <span>{t("onboarding.look.light")}</span>
                      </button>
                    </div>
                  </div>
                  <div className="setting-inline">
                    <span>{t("onboarding.look.sounds")}</span>
                    <Toggle
                      checked={settings.sounds}
                      onChange={(value) => void save({ sounds: value })}
                      label={t("onboarding.look.sounds")}
                    />
                  </div>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <footer className="onboarding__foot">
            <Button
              variant="subtle"
              icon="arrowLeft"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={step === 0}
            >
              {t("common.back")}
            </Button>
            <div className="onboarding__foot-right">
              <span className="dim">{t("onboarding.step", { current: step + 1, total: STEPS })}</span>
              {step < STEPS - 1 ? (
                <Button variant="primary" iconRight="chevronRight" onClick={() => setStep((value) => value + 1)}>
                  {t("common.continue")}
                </Button>
              ) : (
                <Button variant="primary" icon="check" onClick={() => void finish()}>
                  {t("onboarding.done.open")}
                </Button>
              )}
            </div>
          </footer>
        </div>
      </div>

      <div className="onboarding__chips" aria-hidden="true">
        <Chip tone="mint" icon="package">20 {t("home.stat.packs")}</Chip>
        <Chip tone="blue" icon="cube">144 {t("home.stat.mods")}</Chip>
        <Chip tone="violet" icon="sparkles">12 {t("home.stat.shaders")}</Chip>
      </div>
    </div>
  );
}
