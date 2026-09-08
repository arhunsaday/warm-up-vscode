import { languageLabel } from "@core/data";
import {
  NATURAL_LANGUAGES,
  PROGRAMMING_LANGUAGES,
  QUOTE_LENGTHS,
  TIME_COUNTS,
  TYPING_MODES,
  WORD_COUNTS,
} from "@shared/settings";
import type { AppSettings } from "./settings";

interface ToolbarProps {
  settings: AppSettings;
  hidden: boolean;
  onChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onOpenPalette: () => void;
}

export function Toolbar({ settings, hidden, onChange, onOpenPalette }: ToolbarProps) {
  const { mode } = settings;
  const generatesWords = mode === "words" || mode === "time";
  const counts = mode === "time" ? TIME_COUNTS : WORD_COUNTS;

  return (
    <div className={`bar${hidden ? " bar--hidden" : ""}`} aria-hidden={hidden}>
      {generatesWords && (
        <fieldset className="bar__group">
          <legend className="visually-hidden">Text options</legend>
          <Chip
            label="punctuation"
            active={settings.punctuation}
            onClick={() => onChange("punctuation", !settings.punctuation)}
          />
          <Chip
            label="numbers"
            active={settings.numbers}
            onClick={() => onChange("numbers", !settings.numbers)}
          />
        </fieldset>
      )}

      <fieldset className="bar__group">
        <legend className="visually-hidden">Mode</legend>
        {TYPING_MODES.map((value) => (
          <Chip
            key={value}
            label={value}
            active={mode === value}
            onClick={() => onChange("mode", value)}
          />
        ))}
      </fieldset>

      {generatesWords && (
        <fieldset className="bar__group">
          <legend className="visually-hidden">Length</legend>
          {counts.map((value) => (
            <Chip
              key={value}
              label={String(value)}
              active={settings.count === value}
              onClick={() => onChange("count", value)}
            />
          ))}
        </fieldset>
      )}

      {mode === "quotes" && (
        <fieldset className="bar__group">
          <legend className="visually-hidden">Quote length</legend>
          {QUOTE_LENGTHS.map((value) => (
            <Chip
              key={value}
              label={value}
              active={settings.quoteLength === value}
              onClick={() => onChange("quoteLength", value)}
            />
          ))}
        </fieldset>
      )}

      {mode !== "zen" && (
        <label className="bar__select">
          <span className="visually-hidden">Language</span>
          <select
            value={mode === "code" ? settings.programmingLanguage : settings.language}
            onChange={(event) =>
              mode === "code"
                ? onChange(
                    "programmingLanguage",
                    event.target.value as AppSettings["programmingLanguage"],
                  )
                : onChange("language", event.target.value as AppSettings["language"])
            }
          >
            {(mode === "code" ? PROGRAMMING_LANGUAGES : NATURAL_LANGUAGES).map((option) => (
              <option key={option} value={option}>
                {languageLabel(option)}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="button" className="bar__palette" onClick={onOpenPalette}>
        settings <kbd>⌘K</kbd>
      </button>
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`chip${active ? " chip--active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
