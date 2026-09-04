import { useCallback, useEffect, useState } from "react";
import { THEMES } from "./settings";
import { type AppSettings, loadSettings, saveSettings } from "./settings";

/** Settings, persisted to localStorage and reflected onto the document. */
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const theme = THEMES[settings.theme];
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--ink", theme.ink);
    const light = settings.theme === "paper";
    root.classList.toggle("is-light", light);
    // Makes native controls (the language <select>, scrollbars) match.
    root.style.colorScheme = light ? "light" : "dark";
    root.classList.toggle("is-colorblind", settings.colorBlindMode);
  }, [settings.theme, settings.colorBlindMode]);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  return { settings, update };
}
