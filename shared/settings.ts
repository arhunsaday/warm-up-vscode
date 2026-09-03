/**
 * Single source of truth for the extension settings.
 *
 * The extension host uses it to read/write `workspace.getConfiguration()` and to
 * generate the quick-pick commands; the webview uses it to render the toolbar.
 * Keep it in sync with `contributes.configuration` in `package.json` — the unit
 * tests assert that both stay aligned.
 */

export const TYPING_MODES = ["words", "time", "code"] as const;
export type TypingMode = (typeof TYPING_MODES)[number];

export const STOP_ON_ERROR = ["off", "letter", "word"] as const;
export type StopOnError = (typeof STOP_ON_ERROR)[number];

export const SOUND_PACKS = ["off", "click", "typewriter", "beep"] as const;
export type SoundPack = (typeof SOUND_PACKS)[number];

export const CARET_STYLES = ["line", "block", "underline", "off"] as const;
export type CaretStyle = (typeof CARET_STYLES)[number];

export const QUICK_RESTART_KEYS = ["esc", "tab", "off"] as const;
export type QuickRestart = (typeof QUICK_RESTART_KEYS)[number];

export const COUNTS = [10, 15, 25, 30, 50, 60, 100, 120, 240] as const;

/** Counts offered in the toolbar, per mode. */
export const WORD_COUNTS = [10, 25, 50, 100] as const;
export const TIME_COUNTS = [15, 30, 60, 120] as const;

export const NATURAL_LANGUAGES = [
  "english",
  "englishTop1000",
  "chinese",
  "finnish",
  "french",
  "german",
  "italian",
  "korean",
  "polish",
  "portuguese",
  "russian",
  "spanish",
  "swedish",
  "turkish",
] as const;
export type NaturalLanguage = (typeof NATURAL_LANGUAGES)[number];

export const PROGRAMMING_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "cpp",
  "c",
  "go",
  "kotlin",
  "php",
  "ruby",
  "rust",
] as const;
export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number];

export interface WarmUpSettings {
  mode: TypingMode;
  count: number;
  language: NaturalLanguage;
  programmingLanguage: ProgrammingLanguage;
  punctuation: boolean;
  numbers: boolean;
  stopOnError: StopOnError;
  sound: SoundPack;
  errorSound: boolean;
  volume: number;
  caretStyle: CaretStyle;
  smoothCaret: boolean;
  liveStats: boolean;
  fontSize: number;
  colorBlindMode: boolean;
  quickRestart: QuickRestart;
}

export const DEFAULT_SETTINGS: WarmUpSettings = {
  mode: "words",
  count: 25,
  language: "english",
  programmingLanguage: "javascript",
  punctuation: false,
  numbers: false,
  stopOnError: "off",
  sound: "off",
  errorSound: true,
  volume: 0.4,
  caretStyle: "line",
  smoothCaret: true,
  liveStats: true,
  fontSize: 26,
  colorBlindMode: false,
  quickRestart: "esc",
};

export type SettingKey = keyof WarmUpSettings;

/**
 * Describes a setting well enough to build a quick pick for it without writing
 * one command handler per setting.
 */
export type SettingDefinition =
  | {
      key: SettingKey;
      title: string;
      prompt: string;
      kind: "enum";
      values: readonly (string | number)[];
      icons?: Record<string, string>;
      /** Command id registered for this setting, when it has a dedicated one. */
      command?: string;
    }
  | {
      key: SettingKey;
      title: string;
      prompt: string;
      kind: "boolean";
      command?: string;
    }
  | {
      key: SettingKey;
      title: string;
      prompt: string;
      kind: "number";
      min: number;
      max: number;
      command?: string;
    };

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: "mode",
    title: "Typing mode",
    prompt: "Type a fixed amount of words, race the clock, or type code.",
    kind: "enum",
    values: TYPING_MODES,
    icons: { words: "book", time: "watch", code: "code" },
    command: "warmUp.setMode",
  },
  {
    key: "count",
    title: "Word / time count",
    prompt: 'Amount of words, or seconds on the clock (ignored in "code" mode).',
    kind: "enum",
    values: COUNTS,
    command: "warmUp.setCount",
  },
  {
    key: "language",
    title: "Natural language",
    prompt: "Language to practice with.",
    kind: "enum",
    values: NATURAL_LANGUAGES,
    command: "warmUp.setLanguage",
  },
  {
    key: "programmingLanguage",
    title: "Programming language",
    prompt: "Programming language used for code snippets.",
    kind: "enum",
    values: PROGRAMMING_LANGUAGES,
    command: "warmUp.setProgrammingLanguage",
  },
  {
    key: "punctuation",
    title: "Punctuation",
    prompt: "Sprinkle punctuation into the generated words.",
    kind: "boolean",
    command: "warmUp.togglePunctuation",
  },
  {
    key: "numbers",
    title: "Numbers",
    prompt: "Sprinkle numbers into the generated words.",
    kind: "boolean",
    command: "warmUp.toggleNumbers",
  },
  {
    key: "stopOnError",
    title: "Stop on error",
    prompt: "Block on a mistake until it is corrected, or keep going.",
    kind: "enum",
    values: STOP_ON_ERROR,
    icons: { off: "circle-slash", letter: "whole-word", word: "symbol-text" },
    command: "warmUp.setStopOnError",
  },
  {
    key: "sound",
    title: "Keypress sound",
    prompt: "Sound played on every keypress.",
    kind: "enum",
    values: SOUND_PACKS,
    icons: { off: "mute", click: "unmute", typewriter: "unmute", beep: "unmute" },
    command: "warmUp.setSound",
  },
  {
    key: "errorSound",
    title: "Error sound",
    prompt: "Play a distinct sound when you mistype.",
    kind: "boolean",
  },
  {
    key: "volume",
    title: "Volume",
    prompt: "Sound effect volume, between 0 and 1.",
    kind: "number",
    min: 0,
    max: 1,
  },
  {
    key: "caretStyle",
    title: "Caret style",
    prompt: "Shape of the typing caret.",
    kind: "enum",
    values: CARET_STYLES,
  },
  {
    key: "smoothCaret",
    title: "Smooth caret",
    prompt: "Animate the caret between characters.",
    kind: "boolean",
  },
  {
    key: "liveStats",
    title: "Live stats",
    prompt: "Show live WPM and accuracy while typing.",
    kind: "boolean",
  },
  {
    key: "fontSize",
    title: "Font size",
    prompt: "Font size of the text you type, in pixels.",
    kind: "number",
    min: 12,
    max: 64,
  },
  {
    key: "colorBlindMode",
    title: "Color blind mode",
    prompt: "Use a blue/orange palette instead of green/red.",
    kind: "boolean",
    command: "warmUp.toggleColorBlindMode",
  },
  {
    key: "quickRestart",
    title: "Quick restart key",
    prompt: "Key that restarts the test instantly.",
    kind: "enum",
    values: QUICK_RESTART_KEYS,
  },
];

export function settingDefinition(key: SettingKey): SettingDefinition {
  const definition = SETTING_DEFINITIONS.find((entry) => entry.key === key);
  if (!definition) {
    throw new Error(`Unknown setting: ${key}`);
  }
  return definition;
}
