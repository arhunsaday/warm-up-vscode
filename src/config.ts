import { ConfigurationTarget, workspace } from "vscode";
import {
  DEFAULT_SETTINGS,
  NATURAL_LANGUAGES,
  PROGRAMMING_LANGUAGES,
  type SettingKey,
  type WarmUpSettings,
} from "../shared/settings";

export const CONFIG_SECTION = "warmUp";

/** Reads every setting, falling back to the defaults for unknown values. */
export function readSettings(): WarmUpSettings {
  const config = workspace.getConfiguration(CONFIG_SECTION);
  const settings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    const value = config.get(key);
    if (value !== undefined && value !== null) {
      // The cast is safe: the schema in package.json constrains the values, and
      // anything unexpected is filtered out by `sanitize` below.
      (settings as Record<string, unknown>)[key] = value;
    }
  }

  return sanitize(settings);
}

/** Guards against hand-edited settings.json values that are out of range. */
function sanitize(settings: WarmUpSettings): WarmUpSettings {
  const sanitized = { ...settings };

  if (!NATURAL_LANGUAGES.includes(sanitized.language)) {
    sanitized.language = DEFAULT_SETTINGS.language;
  }
  if (!PROGRAMMING_LANGUAGES.includes(sanitized.programmingLanguage)) {
    sanitized.programmingLanguage = DEFAULT_SETTINGS.programmingLanguage;
  }
  sanitized.count = clamp(Math.round(Number(sanitized.count)) || DEFAULT_SETTINGS.count, 5, 600);
  sanitized.volume = clamp(Number(sanitized.volume), 0, 1);
  sanitized.fontSize = clamp(
    Math.round(Number(sanitized.fontSize)) || DEFAULT_SETTINGS.fontSize,
    12,
    64,
  );

  return sanitized;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export async function writeSetting(key: SettingKey, value: unknown): Promise<void> {
  await workspace.getConfiguration(CONFIG_SECTION).update(key, value, ConfigurationTarget.Global);
}

/**
 * v1 stored everything as strings under different names. Move any value the
 * user had explicitly set over to the v2 keys, once, so upgrading does not
 * silently reset preferences.
 */
const LEGACY_KEYS: Record<string, { key: SettingKey; convert: (value: string) => unknown }> = {
  switchNaturalLanguage: { key: "language", convert: (value) => value },
  switchProgrammingLanguage: { key: "programmingLanguage", convert: (value) => value },
  changeTypingMode: {
    key: "mode",
    convert: (value) =>
      ({
        "words (fixed amount)": "words",
        "words (against the clock)": "time",
        "code snippets": "code",
      })[value] ?? "words",
  },
  changeCount: { key: "count", convert: (value) => Number(value) || DEFAULT_SETTINGS.count },
  togglePunctuation: { key: "punctuation", convert: (value) => value === "true" },
  toggleColorBlindMode: { key: "colorBlindMode", convert: (value) => value === "true" },
};

export async function migrateLegacySettings(): Promise<SettingKey[]> {
  const config = workspace.getConfiguration(CONFIG_SECTION);
  const migrated: SettingKey[] = [];

  for (const [legacyKey, { key, convert }] of Object.entries(LEGACY_KEYS)) {
    const previous = config.inspect<string>(legacyKey)?.globalValue;
    if (previous === undefined) {
      continue;
    }

    const alreadySet = config.inspect(key)?.globalValue !== undefined;
    if (!alreadySet) {
      await config.update(key, convert(previous), ConfigurationTarget.Global);
      migrated.push(key);
    }
    await config.update(legacyKey, undefined, ConfigurationTarget.Global);
  }

  return migrated;
}
