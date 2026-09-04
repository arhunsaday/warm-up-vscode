import confetti from "canvas-confetti";
import { useEffect, useRef, useState } from "react";
import { TypingInput, WordsSurface } from "../typing/Surface";
import { useReportStatus } from "../typing/status";
import { useTypingRun } from "../typing/useTypingRun";
import { type AppSettings, DEFAULT_APP_SETTINGS } from "../app/settings";

const HERO_WORDS = "Warm up before you code".split(" ");

/** The headline is a demo, not a configurable test: no sound, no stop-on-error. */
const HERO_SETTINGS: AppSettings = { ...DEFAULT_APP_SETTINGS, sound: "off", mode: "words" };

/**
 * The headline is the typing test.
 *
 * Every landing page for a typing product shows you a recording of one. This
 * one hands you the product in the first two seconds: the words are readable as
 * a headline, and they light up as you type them.
 */
export function HeroTest() {
  const run = useTypingRun({ settings: HERO_SETTINGS, fixedWords: HERO_WORDS });
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const report = useReportStatus();
  const celebrated = useRef(false);

  useEffect(() => {
    if (run.running || run.finished) {
      report({
        source: "hero",
        speed: run.stats.speed,
        accuracy: run.stats.accuracy,
        progress: run.progress.label,
        finished: run.finished,
        credible: run.credible,
      });
    }
  }, [run.running, run.finished, run.stats, run.progress.label, run.credible, report]);

  useEffect(() => {
    if (!run.finished || celebrated.current) {
      return;
    }
    celebrated.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }
    void confetti({
      particleCount: 90,
      spread: 78,
      startVelocity: 34,
      origin: { y: 0.34 },
      colors: ["#ffb340", "#ff9500", "#ffe6bd", "#7aa2ff"],
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  }, [run.finished]);

  useEffect(() => {
    if (!run.finished) {
      celebrated.current = false;
    }
  }, [run.finished]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only moves focus to the real input.
    <div
      className={`hero-test${focused ? " hero-test--live" : ""}${run.finished ? " hero-test--done" : ""}`}
      onClick={() => inputRef.current?.focus()}
    >
      <h1 className="hero-test__line">
        <WordsSurface state={run.session?.words ?? EMPTY_WORDS} variant="flow" />
      </h1>

      <div className="hero-test__prompt" aria-live="polite">
        {run.finished && !run.credible ? (
          <div className="hero-test__result hero-test__result--void">
            <span className="hero-test__result-unit">
              too fast to measure — type it, don't paste it
            </span>
            <button type="button" className="ghost-button" onClick={() => run.restart()}>
              again
            </button>
          </div>
        ) : run.finished ? (
          <div className="hero-test__result">
            <span className="hero-test__result-value">{run.stats.speed}</span>
            <span className="hero-test__result-unit">wpm</span>
            <span className="hero-test__result-sep" />
            <span className="hero-test__result-value">{run.stats.accuracy}%</span>
            <span className="hero-test__result-unit">accuracy</span>
            <button type="button" className="ghost-button" onClick={() => run.restart()}>
              again
            </button>
          </div>
        ) : focused ? (
          <span className="hero-test__hint hero-test__hint--live">
            keep going<span className="blink">_</span>
          </span>
        ) : (
          <span className="hero-test__hint">
            <kbd>click</kbd> and type the line above
          </span>
        )}
      </div>

      <TypingInput
        inputRef={inputRef}
        label="Type the headline"
        onChar={run.typeChar}
        onBackspace={run.backspace}
        onRestart={run.restart}
        onFocusChange={setFocused}
      />
    </div>
  );
}

const EMPTY_WORDS = { words: [], typed: [""], active: 0, finished: false };
