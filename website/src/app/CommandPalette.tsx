import { useEffect, useMemo, useRef, useState } from "react";
import { SETTING_DEFINITIONS, type SettingDefinition } from "@shared/settings";
import { THEMES } from "./settings";
import type { AppSettings } from "./settings";

interface Command {
  id: string;
  group: string;
  label: string;
  hint: string;
  run: () => void;
}

interface PaletteProps {
  open: boolean;
  settings: AppSettings;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onClose: () => void;
  onClearHistory: () => void;
}

/**
 * ⌘K opens every setting in one searchable list, which suits a product that
 * lives in VS Code better than a drawer full of toggles does.
 */
export function CommandPalette({ open, settings, onChange, onClose, onClearHistory }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    for (const definition of SETTING_DEFINITIONS) {
      // Extension-only settings have no meaning on the web.
      if (definition.key === "codeInEditor") {
        continue;
      }
      list.push(...commandsFor(definition, settings, onChange));
    }

    for (const [name, theme] of Object.entries(THEMES)) {
      list.push({
        id: `theme:${name}`,
        group: "Theme",
        label: theme.label,
        hint: settings.theme === name ? "current" : "",
        run: () => onChange("theme", name as AppSettings["theme"]),
      });
    }

    list.push({
      id: "history:clear",
      group: "History",
      label: "Clear results history",
      hint: "cannot be undone",
      run: onClearHistory,
    });

    return list;
  }, [settings, onChange, onClearHistory]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return commands;
    }
    return commands.filter((command) =>
      `${command.group} ${command.label}`.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(0, matches.length - 1)));
  }, [matches.length]);

  if (!open) {
    return null;
  }

  const choose = (command: Command | undefined) => {
    if (!command) {
      return;
    }
    command.run();
    onClose();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the backdrop mirrors the Escape key.
    <div className="palette" onClick={onClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stops the backdrop from closing on inner clicks. */}
      <div className="palette__box" onClick={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          placeholder="Search settings…"
          value={query}
          aria-label="Search settings"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((current) => Math.min(current + 1, matches.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(matches[cursor]);
            }
          }}
        />

        <ul className="palette__list">
          {matches.length === 0 && <li className="palette__empty">No matching setting</li>}
          {matches.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                className={`palette__item${index === cursor ? " palette__item--active" : ""}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => choose(command)}
              >
                <span className="palette__group">{command.group}</span>
                <span className="palette__label">{command.label}</span>
                {command.hint && <span className="palette__hint">{command.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Turns one setting into the commands that change it. */
function commandsFor(
  definition: SettingDefinition,
  settings: AppSettings,
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void,
): Command[] {
  const key = definition.key as keyof AppSettings;
  const current = settings[key];

  if (definition.kind === "boolean") {
    return [
      {
        id: `set:${key}`,
        group: definition.title,
        label: current ? "turn off" : "turn on",
        hint: current ? "on" : "off",
        run: () => onChange(key, !current as AppSettings[typeof key]),
      },
    ];
  }

  if (definition.kind === "number") {
    const steps = key === "volume" ? [0, 0.25, 0.5, 0.75, 1] : [18, 22, 26, 32, 40, 48];
    return steps.map((value) => ({
      id: `set:${key}:${value}`,
      group: definition.title,
      label: String(value),
      hint: current === value ? "current" : "",
      run: () => onChange(key, value as AppSettings[typeof key]),
    }));
  }

  return definition.values.map((value) => ({
    id: `set:${key}:${value}`,
    group: definition.title,
    label: String(value),
    hint: current === value ? "current" : "",
    run: () => onChange(key, value as AppSettings[typeof key]),
  }));
}
