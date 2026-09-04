import { DEFAULT_SETTINGS, type WarmUpSettings } from "@shared/settings";

/** Palettes for the web app. The extension takes its colours from the editor. */
export const THEMES = {
  ember: { label: "ember", accent: "#ffb340", bg: "#08090c", ink: "#f4f5f7" },
  mint: { label: "mint", accent: "#5fe3b0", bg: "#07100d", ink: "#eaf7f2" },
  iris: { label: "iris", accent: "#a78bfa", bg: "#0b0912", ink: "#f2effc" },
  paper: { label: "paper", accent: "#c2410c", bg: "#f7f5f0", ink: "#231f1c" },
  mono: { label: "mono", accent: "#e5e7eb", bg: "#0a0a0a", ink: "#f5f5f5" },
} as const;

export type ThemeName = keyof typeof THEMES;

export interface AppSettings extends WarmUpSettings {
  theme: ThemeName;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  // The web app is a keyboard-first page; sound on by default makes it feel alive.
  sound: "click",
  theme: "ember",
};

const SETTINGS_KEY = "warmup.settings.v1";
const HISTORY_KEY = "warmup.history.v1";

/** localStorage throws in private modes and when quotas are exhausted. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do: the app works fine without persistence.
  }
}

export function loadSettings(): AppSettings {
  const stored = read<AppSettings>(SETTINGS_KEY, DEFAULT_APP_SETTINGS);
  return stored.theme in THEMES ? stored : { ...stored, theme: "ember" };
}

export function saveSettings(settings: AppSettings): void {
  write(SETTINGS_KEY, settings);
}

export function loadHistory<T>(): T[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(results: unknown[]): void {
  write(HISTORY_KEY, results.slice(0, 300));
}
