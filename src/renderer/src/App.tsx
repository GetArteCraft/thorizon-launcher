import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { ToastHost } from "./components/ToastHost";
import { CommandPalette } from "./components/CommandPalette";
import { InstallDock } from "./components/InstallDock";
import { Button } from "./components/ui";
import { Icon } from "./components/Icon";
import { I18nProvider, detectLocale, useI18n } from "./i18n";
import { useUi, type Tab } from "./store";
import { api, errorText } from "./lib/api";
import { Onboarding } from "./screens/Onboarding";
import { packs } from "./lib/data";
import { HomeScreen } from "./screens/Home";
import { PacksScreen, PackDetailScreen } from "./screens/Packs";
import { ModsScreen, ShadersScreen, ResourcePacksScreen } from "./screens/Registry";
import { InstancesScreen } from "./screens/Instances";
import { LibraryScreen } from "./screens/Library";
import { EditorScreen } from "./screens/Editor";
import { ServersScreen } from "./screens/Servers";
import { SettingsScreen } from "./screens/Settings";
import { DiagnosticsScreen } from "./screens/Diagnostics";

const TAB_ORDER: Tab[] = [
  "home",
  "packs",
  "mods",
  "shaders",
  "resourcepacks",
  "servers",
  "instances",
  "library",
  "editor",
];

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("renderer", error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash">
        <span className="crash__icon"><Icon name="alert" size={26} /></span>
        <h1>This screen failed to render.</h1>
        <p>The rest of the launcher keeps working. Switch screen or reload the window.</p>
        <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
}

function clickSound(enabled: boolean) {
  if (!enabled) return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 640;
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.07);
    oscillator.onended = () => void context.close();
  } catch {
    // звук — необязательное украшение
  }
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash__mark">
        <span className="brand-mark brand-mark--xl"><span /></span>
      </div>
      <h1>THorizon</h1>
      <div className="splash__bar"><span /></div>
      <p>Reading the catalog…</p>
    </div>
  );
}

function CurrentScreen() {
  const tab = useUi((state) => state.tab);
  const detail = useUi((state) => state.detail);

  if (detail?.kind === "pack") return <PackDetailScreen />;
  switch (tab) {
    case "home":
      return <HomeScreen />;
    case "packs":
      return <PacksScreen />;
    case "mods":
      return <ModsScreen />;
    case "shaders":
      return <ShadersScreen />;
    case "resourcepacks":
      return <ResourcePacksScreen />;
    case "servers":
      return <ServersScreen />;
    case "instances":
      return <InstancesScreen />;
    case "library":
      return <LibraryScreen />;
    case "editor":
      return <EditorScreen />;
    case "settings":
      return <SettingsScreen />;
    case "diagnostics":
      return <DiagnosticsScreen />;
  }
}

function Shell() {
  const { t, locale } = useI18n();
  const settings = useUi((state) => state.settings);
  const setSettings = useUi((state) => state.setSettings);
  const setEnv = useUi((state) => state.setEnv);
  const setProfiles = useUi((state) => state.setProfiles);
  const setServers = useUi((state) => state.setServers);
  const setInstall = useUi((state) => state.setInstall);
  const setUpdate = useUi((state) => state.setUpdate);
  const setOnboarding = useUi((state) => state.setOnboarding);
  const onboarding = useUi((state) => state.onboarding);
  const tab = useUi((state) => state.tab);
  const detail = useUi((state) => state.detail);
  const ready = useUi((state) => state.ready);
  const setReady = useUi((state) => state.setReady);
  const toast = useUi((state) => state.pushToast);
  const appendConsole = useUi((state) => state.appendConsole);
  const appendNative = useUi((state) => state.appendNative);
  const navigate = useUi((state) => state.navigate);
  const closeDetail = useUi((state) => state.closeDetail);
  const setPalette = useUi((state) => state.setPalette);
  const palette = useUi((state) => state.palette);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.reduced = String(settings.reducedMotion);
    document.documentElement.lang = locale;
  }, [settings.theme, settings.reducedMotion, locale]);

  useEffect(() => {
    if (!api) {
      setReady(true);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [nextSettings, env, profiles, servers, update] = await Promise.all([
          api.settingsGet(),
          api.checkEnv(),
          api.profilesList(),
          api.serversList(),
          api.updatesState(),
        ]);
        if (!alive) return;
        setSettings(nextSettings);
        setEnv(env);
        setProfiles(profiles);
        setServers(servers);
        setUpdate(update);
        setOnboarding(!nextSettings.dismissedOnboarding);
        setReady(true);
      } catch (error) {
        if (!alive) return;
        toast("error", errorText(error, locale));
        setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!api) return;
    const offInstall = api.onInstallProgress((progress) => {
      setInstall(progress);
      if (progress.phase === "done") {
        toast("success", t("pack.installDone", { name: progress.id }));
        void api?.profilesList().then(setProfiles);
      }
      if (progress.phase === "error") {
        toast("error", progress.message ?? t("install.error"));
      }
    });
    const offServer = api.onServerLine(({ line }) => appendConsole(line));
    const offNative = api.onNativeLine(({ id, line }) => appendNative(id, line));
    const offUpdate = api.onUpdateState(setUpdate);
    const offNavigate = api.onNavigate((next) => {
      const known = ["home", "packs", "mods", "shaders", "resourcepacks", "servers", "instances", "library", "editor", "settings", "diagnostics"] as const;
      if ((known as readonly string[]).includes(next)) navigate(next as Tab);
    });
    return () => {
      offInstall();
      offServer();
      offNative();
      offUpdate();
      offNavigate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette(!palette);
      }
      if (event.key === "Escape") {
        if (palette) setPalette(false);
        else if (detail) closeDetail();
      }
      if ((event.ctrlKey || event.metaKey) && /^[1-9]$/.test(event.key)) {
        const target = TAB_ORDER[Number(event.key) - 1];
        if (target) {
          event.preventDefault();
          navigate(target);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette, detail, setPalette, closeDetail, navigate]);

  useEffect(() => {
    const onPointer = () => clickSound(settings.sounds);
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [settings.sounds]);

  if (!ready) return <Splash />;

  if (!api) {
    return (
      <div className="crash">
        <span className="crash__icon"><Icon name="alert" size={26} /></span>
        <h1>This window must run inside Electron.</h1>
        <p>Start it with <code>npm run dev</code> in the launcher folder, not in a browser tab.</p>
      </div>
    );
  }

  const title =
    detail?.kind === "pack"
      ? packs.find((pack) => pack.id === detail.id)?.name ?? t("packs.details")
      : t(`nav.${tab}`);
  const subtitle = `${t("app.tagline")}`;

  return (
    <div className="app">
      <TitleBar title={title} subtitle={tab === "home" ? subtitle : undefined} />
      <div className="app__body">
        {onboarding ? (
          <Onboarding />
        ) : (
          <>
            <Sidebar />
            <main className="main">
              <ErrorBoundary>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    <CurrentScreen />
                  </motion.div>
                </AnimatePresence>
              </ErrorBoundary>
            </main>
          </>
        )}
      </div>
      <ToastHost />
      <CommandPalette />
      <InstallDock />
    </div>
  );
}

export function App() {
  const settings = useUi((state) => state.settings);
  const locale = detectLocale(settings.language);
  return (
    <I18nProvider locale={locale}>
      <Shell />
    </I18nProvider>
  );
}
