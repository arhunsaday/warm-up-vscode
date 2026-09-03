import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SETTING_DEFINITIONS, type SettingKey } from "./settings";

interface ConfigProperty {
  type: string;
  default: unknown;
  enum?: (string | number)[];
}

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  contributes: {
    configuration: { properties: Record<string, ConfigProperty> };
    commands: { command: string }[];
  };
};

const properties = manifest.contributes.configuration.properties;

/**
 * The manifest and the shared schema are written by hand in two places; these
 * tests are what keeps them honest.
 */
describe("settings schema", () => {
  it("declares every setting in package.json", () => {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      expect(properties[`warmUp.${key}`], `warmUp.${key} missing from package.json`).toBeDefined();
    }
  });

  it("declares no extra settings in package.json", () => {
    for (const key of Object.keys(properties)) {
      expect(key.replace("warmUp.", "") in DEFAULT_SETTINGS).toBe(true);
    }
  });

  it("agrees on every default value", () => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      expect(properties[`warmUp.${key}`].default, `default for warmUp.${key}`).toEqual(value);
    }
  });

  it("agrees on every enum", () => {
    for (const definition of SETTING_DEFINITIONS) {
      if (definition.kind !== "enum") {
        continue;
      }
      expect(properties[`warmUp.${definition.key}`].enum, definition.key).toEqual([
        ...definition.values,
      ]);
    }
  });

  it("describes every setting exactly once", () => {
    const keys = SETTING_DEFINITIONS.map((definition) => definition.key);

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual((Object.keys(DEFAULT_SETTINGS) as SettingKey[]).sort());
  });

  it("registers a command for every setting that advertises one", () => {
    const commands = new Set(manifest.contributes.commands.map((entry) => entry.command));

    for (const definition of SETTING_DEFINITIONS) {
      if (definition.command) {
        expect(commands.has(definition.command), definition.command).toBe(true);
      }
    }
  });
});
