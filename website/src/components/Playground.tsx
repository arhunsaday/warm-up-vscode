import { useEffect, useRef, useState } from "react";
import { CodeSurface, TypingInput, WordsSurface } from "../typing/Surface";
import { useReportStatus } from "../typing/status";
import { useTypingRun } from "../typing/useTypingRun";
import { DEFAULT_APP_SETTINGS } from "../app/settings";
import { Keyboard } from "./Keyboard";

const BASE = { ...DEFAULT_APP_SETTINGS, sound: "off" as const };

const TABS = [
  { id: "words", file: "words.txt", settings: { ...BASE, mode: "words" as const, count: 25 } },
  { id: "time", file: "clock.txt", settings: { ...BASE, mode: "time" as const, count: 30 } },
  { id: "quotes", file: "quote.md", settings: { ...BASE, mode: "quotes" as const } },
  { id: "code", file: "snippet.ts", settings: { ...BASE, mode: "code" as const } },
];

/** The real thing, with the modes you would actually use. */
export function Playground() {
  const [tab, setTab] = useState(TABS[0]);
  const run = useTypingRun({ settings: tab.settings });
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const report = useReportStatus();

  useEffect(() => {
    if (run.running || run.finished) {
      report({
        source: "playground",
        speed: run.stats.speed,
        accuracy: run.stats.accuracy,
        progress: run.progress.label,
        finished: run.finished,
        credible: run.credible,
      });
    }
  }, [run.running, run.finished, run.stats, run.progress.label, run.credible, report]);

  return (
    <section className="section" id="try">
      <SectionHeading index="01" title="Try the real thing" />
      <p className="section__lead">Not a recording. This runs the extension's engine.</p>

      <div className={`pane${focused ? " pane--live" : ""}`}>
        <div className="pane__tabs" role="tablist" aria-label="Typing mode">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab.id === entry.id}
              className={`pane__tab${tab.id === entry.id ? " pane__tab--active" : ""}`}
              onClick={() => setTab(entry)}
            >
              <span className="pane__tab-dot" />
              {entry.file}
            </button>
          ))}
          <span className="pane__spacer" />
          <span className="pane__readout">
            <b>{run.credible ? run.stats.speed : "—"}</b> wpm
            <span className="pane__readout-sep">·</span>
            <b>{run.stats.accuracy}</b>%
          </span>
        </div>

        {/* biome-ignore lint/a11y/useKeyWithClickEvents: the click only moves focus to the real input. */}
        <div className="pane__body" onClick={() => inputRef.current?.focus()}>
          {run.finished ? (
            <div className="pane__results">
              <div className="pane__results-figures">
                <Figure value={run.credible ? run.stats.speed : "—"} label="wpm" big />
                <Figure value={`${run.stats.accuracy}%`} label="accuracy" />
                <Figure value={run.credible ? run.stats.rawSpeed : "—"} label="raw" />
                <Figure value={`${run.stats.consistency}%`} label="consistency" />
              </div>
              <div className="pane__results-keys">
                <p className="pane__results-caption">keys you missed</p>
                <Keyboard stats={run.keyStats} />
              </div>
              <button type="button" className="button button--primary" onClick={() => run.restart()}>
                go again
              </button>
            </div>
          ) : (
            <>
              {run.session?.code ? (
                <CodeSurface state={run.session.code} classes={run.session.codeClasses} />
              ) : (
                run.session?.words && <WordsSurface state={run.session.words} variant="window" />
              )}
              {!focused && (
                <div className="pane__overlay">
                  <kbd>click</kbd> to start
                </div>
              )}
            </>
          )}
        </div>

        <div className="pane__footer">
          <span>{run.session?.quote ? run.session.quote.source : run.progress.label}</span>
          <button type="button" className="ghost-button" onClick={() => run.restart()}>
            restart <kbd>esc</kbd>
          </button>
        </div>

        <TypingInput
          inputRef={inputRef}
          label="Typing playground input"
          onChar={run.typeChar}
          onBackspace={run.backspace}
          onTab={run.tab}
          onRestart={run.restart}
          onFocusChange={setFocused}
        />
      </div>
    </section>
  );
}

function Figure({ value, label, big }: { value: number | string; label: string; big?: boolean }) {
  return (
    <div className={`figure${big ? " figure--big" : ""}`}>
      <span className="figure__value">{value}</span>
      <span className="figure__label">{label}</span>
    </div>
  );
}

export function SectionHeading({ index, title }: { index: string; title: string }) {
  return (
    <h2 className="section__title">
      {/* <span className="section__index">{index}</span> */}
      {title}
    </h2>
  );
}
