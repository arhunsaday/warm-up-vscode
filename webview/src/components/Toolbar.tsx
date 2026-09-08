import { languageLabel } from "@core/data";
import type { CustomText } from "@shared/messages";
import {
  NATURAL_LANGUAGES,
  PROGRAMMING_LANGUAGES,
  QUOTE_LENGTHS,
  type SettingKey,
  TIME_COUNTS,
  type TypingMode,
  WORD_COUNTS,
  type WarmUpSettings,
} from "@shared/settings";

interface ToolbarProps {
  settings: WarmUpSettings;
  custom: CustomText | null;
  hidden: boolean;
  onChange: <K extends SettingKey>(key: K, value: WarmUpSettings[K]) => void;
  onExitCustom: () => void;
  onOpenSettings: () => void;
}

const MODE_LABELS: Record<TypingMode, string> = {
  words: "words",
  time: "time",
  quotes: "quotes",
  code: "code",
  zen: "zen",
};

/** monkeytype-style option bar: everything reachable without leaving the panel. */
export function Toolbar({
  settings,
  custom,
  hidden,
  onChange,
  onExitCustom,
  onOpenSettings,
}: ToolbarProps) {
  const mode = custom ? "code" : settings.mode;
  const counts = mode === "time" ? TIME_COUNTS : WORD_COUNTS;
  /** Only the generated-word modes take punctuation, numbers and a length. */
  const generatesWords = mode === "words" || mode === "time";

  return (
    <div className={`toolbar${hidden ? " toolbar--hidden" : ""}`} aria-hidden={hidden}>
      {custom ? (
        <div className="toolbar__group">
          <span className="chip">practising “{custom.origin}”</span>
          <button type="button" className="toolbar__button" onClick={onExitCustom}>
            back to snippets
          </button>
        </div>
      ) : (
        <>
          {generatesWords && (
            <div className="toolbar__group">
              <Toggle
                label="punctuation"
                active={settings.punctuation}
                onClick={() => onChange("punctuation", !settings.punctuation)}
              />
              <Toggle
                label="numbers"
                active={settings.numbers}
                onClick={() => onChange("numbers", !settings.numbers)}
              />
            </div>
          )}

          <fieldset className="toolbar__group">
            <legend className="visually-hidden">Typing mode</legend>
            {(Object.keys(MODE_LABELS) as TypingMode[]).map((value) => (
              <Toggle
                key={value}
                label={MODE_LABELS[value]}
                active={settings.mode === value}
                onClick={() => onChange("mode", value)}
              />
            ))}
          </fieldset>

          {generatesWords && (
            <fieldset className="toolbar__group">
              <legend className="visually-hidden">Length</legend>
              {counts.map((value) => (
                <Toggle
                  key={value}
                  label={String(value)}
                  active={settings.count === value}
                  onClick={() => onChange("count", value)}
                />
              ))}
            </fieldset>
          )}

          {mode === "quotes" && (
            <fieldset className="toolbar__group">
              <legend className="visually-hidden">Quote length</legend>
              {QUOTE_LENGTHS.map((value) => (
                <Toggle
                  key={value}
                  label={value}
                  active={settings.quoteLength === value}
                  onClick={() => onChange("quoteLength", value)}
                />
              ))}
            </fieldset>
          )}

          {mode !== "zen" && (
            <div className="toolbar__group">
              {mode === "code" ? (
                <Select
                  label="Programming language"
                  value={settings.programmingLanguage}
                  options={PROGRAMMING_LANGUAGES}
                  onChange={(value) =>
                    onChange("programmingLanguage", value as WarmUpSettings["programmingLanguage"])
                  }
                />
              ) : (
                <Select
                  label="Language"
                  value={settings.language}
                  options={NATURAL_LANGUAGES}
                  onChange={(value) => onChange("language", value as WarmUpSettings["language"])}
                />
              )}
            </div>
          )}
        </>
      )}

      <div className="toolbar__group toolbar__group--end">
        <Toggle
          label={settings.sound === "off" ? "sound off" : `sound: ${settings.sound}`}
          active={settings.sound !== "off"}
          onClick={() => onChange("sound", settings.sound === "off" ? "click" : "off")}
        />
        <button type="button" className="toolbar__button" onClick={onOpenSettings}>
          settings
        </button>
      </div>
    </div>
  );
}

function Toggle({
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
      className={`toolbar__button${active ? " toolbar__button--active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="toolbar__select">
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {languageLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
