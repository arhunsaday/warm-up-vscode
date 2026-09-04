import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CodeSurface, TypingInput, WordsSurface } from "../typing/Surface";
import { useTypingRun } from "../typing/useTypingRun";
import { CommandPalette } from "./CommandPalette";
import { History } from "./History";
import { Results } from "./Results";
import { Toolbar } from "./Toolbar";
import { useAppSettings } from "./useAppSettings";
import { useResults } from "./useResults";

/** How long without a keystroke before the caret starts blinking again. */
const IDLE_DELAY = 800;

export function AppPage() {
  const { settings, update } = useAppSettings();
  const { results, add, clear, bestFor } = useResults();
  const run = useTypingRun({ settings, onFinished: add });

  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef(0);
  const [focused, setFocused] = useState(false);
  const [idle, setIdle] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { session, finished, restart } = run;
  const mode = settings.mode;

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    document.body.dataset.route = "app";
    return () => {
      delete document.body.dataset.route;
    };
  }, []);

  // A new session should be immediately typeable.
  useEffect(() => {
    if (session && !paletteOpen) {
      focusInput();
    }
  }, [session, paletteOpen, focusInput]);

  useEffect(() => {
    document.title = run.running
      ? `${run.stats.speed} ${run.stats.unit} — Warm Up`
      : "Warm Up — typing test";
  }, [run.running, run.stats.speed, run.stats.unit]);

  // ⌘K / Ctrl+K from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const markActive = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_DELAY);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (paletteOpen) {
      return;
    }

    if (event.key === "Escape" && settings.quickRestart === "esc") {
      event.preventDefault();
      restart(event.shiftKey);
      return;
    }
    if (event.key === "Tab") {
      // Tab always starts a new test once one is finished, like monkeytype.
      if (finished || settings.quickRestart === "tab") {
        event.preventDefault();
        restart(event.shiftKey);
        return;
      }
      if (session?.kind === "code") {
        event.preventDefault();
        markActive();
        run.tab();
        return;
      }
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      markActive();
      run.backspace(event.ctrlKey || event.altKey || event.metaKey);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      markActive();
      if (finished) {
        restart(false);
      } else if (session?.kind === "zen" && event.shiftKey) {
        run.finishZen();
      } else {
        run.typeChar("\n");
      }
    }
  };

  const hideChrome = run.running && mode !== "zen";

  return (
    <div className="app">
      <header className="app__head">
        <Link className="app__brand" to="/">
          <span className="app__brand-mark" aria-hidden="true" />
          Warm Up
        </Link>
        <span className={`app__counter${run.running ? " app__counter--live" : ""}`}>
          {run.progress.label}
        </span>
        {settings.liveStats && run.running && (
          <span className="app__live">
            <b>{run.stats.speed}</b> {run.stats.unit}
            {mode !== "zen" && <span className="app__live-dim">{run.stats.accuracy}%</span>}
          </span>
        )}
      </header>

      <Toolbar
        settings={settings}
        hidden={hideChrome}
        onChange={update}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main className="app__main">
        {finished && run.result ? (
          <Results
            result={run.result}
            samples={run.samples}
            keyStats={run.keyStats}
            previousBest={bestFor(run.result)}
            quoteSource={session?.quote?.source}
            credible={run.credible}
            canRepeat={mode !== "zen"}
            onRestart={restart}
          />
        ) : (
          // biome-ignore lint/a11y/useKeyWithClickEvents: the click only restores focus.
          <div className={`stage${focused ? "" : " stage--blurred"}`} onClick={focusInput}>
            {session?.kind === "words" && session.words && (
              <WordsSurface
                state={session.words}
                variant="window"
                lineHeight={Math.round(settings.fontSize * 1.6)}
              />
            )}
            {session?.kind === "code" && session.code && (
              <CodeSurface state={session.code} classes={session.codeClasses} />
            )}
            {session?.kind === "zen" && session.zen && (
              <div className="zen">
                {session.zen.typed.length === 0 ? (
                  <span className="zen__placeholder">start typing anything…</span>
                ) : (
                  session.zen.typed
                )}
                <span className="zen__caret" />
              </div>
            )}

            {!focused && <p className="stage__overlay">click here or press any key to focus</p>}
          </div>
        )}

        {!finished && (
          <div className={`app__actions${hideChrome ? " app__actions--hidden" : ""}`}>
            {mode === "zen" && run.running ? (
              <button type="button" className="button button--primary" onClick={run.finishZen}>
                finish <kbd>⇧↵</kbd>
              </button>
            ) : (
              <button type="button" className="ghost-button" onClick={() => restart(false)}>
                restart <kbd>esc</kbd>
              </button>
            )}
          </div>
        )}
      </main>

      <History results={results} onClear={clear} />

      <footer className="app__foot">
        <span>
          <Link to="/">Get Warm Up for VS Code</Link>
        </span>
        <button type="button" className="ghost-button" onClick={() => setPaletteOpen(true)}>
          settings <kbd>⌘K</kbd>
        </button>
      </footer>

      <TypingInput
        inputRef={inputRef}
        label="Typing test input"
        onChar={(char) => {
          markActive();
          run.typeChar(char);
        }}
        onBackspace={run.backspace}
        onTab={run.tab}
        onRestart={() => restart(false)}
        onFocusChange={setFocused}
        onKeyDown={onKeyDown}
      />

      <CommandPalette
        open={paletteOpen}
        settings={settings}
        onChange={update}
        onClose={() => {
          setPaletteOpen(false);
          focusInput();
        }}
        onClearHistory={clear}
      />

      {/* The caret blink is driven by idleness, same as the extension. */}
      <style>{`.surface__caret { animation: ${idle ? "caret-blink 1.05s steps(1) infinite" : "none"}; }`}</style>
    </div>
  );
}
