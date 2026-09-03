import type { NaturalLanguage, TypingMode, WarmUpSettings } from "./settings";

/** A finished run, as persisted in the extension's global state. */
export interface TestResult {
  id: string;
  /** Epoch milliseconds. */
  date: number;
  mode: TypingMode;
  /** Natural language, programming language, or `selection` / a file name. */
  language: string;
  count: number;
  punctuation: boolean;
  numbers: boolean;
  wpm: number;
  rawWpm: number;
  /** Percentage, 0-100. */
  accuracy: number;
  /** Percentage, 0-100. */
  consistency: number;
  durationMs: number;
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
}

/**
 * Identifies comparable runs, so personal bests are not mixed across modes.
 * e.g. `words:25:english:punctuation`.
 */
export function resultKey(result: {
  mode: TypingMode;
  count: number;
  language: string;
  punctuation: boolean;
  numbers: boolean;
}): string {
  const flags = [result.punctuation && "punctuation", result.numbers && "numbers"]
    .filter(Boolean)
    .join("+");
  const base = `${result.mode}:${result.mode === "code" ? "-" : result.count}:${result.language}`;
  return flags ? `${base}:${flags}` : base;
}

/** Text pushed by the host when practising with a selection or a file. */
export interface CustomText {
  text: string;
  /** VS Code language id, used for syntax highlighting. */
  languageId: string;
  /** Human readable origin, shown in the toolbar. */
  origin: string;
}

export type HostMessage =
  | { type: "settings"; settings: WarmUpSettings }
  | { type: "customText"; payload: CustomText }
  | { type: "history"; results: TestResult[] }
  | { type: "focus" };

export type WebviewMessage =
  | { type: "ready" }
  | { type: "updateSetting"; key: keyof WarmUpSettings; value: unknown }
  | { type: "saveResult"; result: TestResult }
  | { type: "clearHistory" }
  | { type: "openSettings" }
  | { type: "notify"; level: "info" | "error"; message: string };

/** State persisted by the webview across VS Code restarts. */
export interface WebviewState {
  settings: WarmUpSettings;
  history: TestResult[];
  customText?: CustomText;
}

export type { NaturalLanguage, TypingMode, WarmUpSettings };
