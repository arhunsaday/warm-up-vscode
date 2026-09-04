import { useCallback, useEffect, useRef, useState } from "react";
import { CodeView } from "./components/CodeView";
import { History } from "./components/History";
import { Results } from "./components/Results";
import { StatsBar } from "./components/StatsBar";
import { Toolbar } from "./components/Toolbar";
import { WordsView } from "./components/WordsView";
import { ZenView } from "./components/ZenView";
import { useTypingTest } from "./hooks/useTypingTest";

/** How long without a keystroke before the caret starts blinking again. */
const IDLE_DELAY = 800;

export function App() {
  const test = useTypingTest();
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef<number>(0);

  const [focused, setFocused] = useState(true);
  const [idle, setIdle] = useState(true);

  const { settings, phase, session, handleChar, handleBackspace, handleTab, restart } = test;
  const mode = test.custom ? "code" : settings.mode;

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  useEffect(() => {
    focusInput();
    const onFocusRequest = () => focusInput();
    window.addEventListener("warmup:focus", onFocusRequest);
    window.addEventListener("focus", onFocusRequest);
    return () => {
      window.removeEventListener("warmup:focus", onFocusRequest);
      window.removeEventListener("focus", onFocusRequest);
    };
  }, [focusInput]);

  // Refocus after every new run so typing just works.
  useEffect(() => {
    if (session) {
      focusInput();
    }
  }, [session, focusInput]);

  useEffect(() => {
    document.body.classList.toggle("colorblind", settings.colorBlindMode);
  }, [settings.colorBlindMode]);

  const markActive = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_DELAY);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { quickRestart } = settings;

    if (event.key === "Escape" && quickRestart === "esc") {
      event.preventDefault();
      restart(event.shiftKey);
      return;
    }

    if (event.key === "Tab" && quickRestart === "tab") {
      event.preventDefault();
      restart(event.shiftKey);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      markActive();
      handleBackspace(event.ctrlKey || event.altKey || event.metaKey);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      markActive();
      if (phase === "finished") {
        restart(false);
      } else if (session?.kind === "zen" && event.shiftKey) {
        test.finishZen();
      } else {
        handleChar("\n");
      }
      return;
    }

    if (event.key === "Tab" && session?.kind === "code") {
      event.preventDefault();
      markActive();
      handleTab();
    }
  };

  /**
   * Text arrives through `input` rather than `keydown` so dead keys (the French
   * layout's backtick), AltGr combinations and IME composition all work.
   */
  const onInput = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    if ((event.nativeEvent as InputEvent).isComposing) {
      return;
    }

    const value = target.value;
    target.value = "";
    if (!value) {
      return;
    }

    markActive();
    for (const char of value) {
      handleChar(char);
    }
  };

  const onContainerClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest("select")) {
      return;
    }
    focusInput();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only restores focus to the real input.
    <div className="app" onClick={onContainerClick}>
      <header className="app__header">
        <h1>Warm Up</h1>
        <p className="app__hint">
          {mode === "zen"
            ? "shift+enter — finish · esc — start over"
            : settings.quickRestart === "off"
              ? "click restart to start over"
              : `${settings.quickRestart} — new test · shift+${settings.quickRestart} — repeat the same text`}
        </p>
      </header>

      <Toolbar
        settings={settings}
        custom={test.custom}
        hidden={phase === "running"}
        onChange={test.updateSetting}
        onExitCustom={test.exitCustom}
        onOpenSettings={test.openSettings}
      />

      <main className="app__main">
        {phase === "finished" && test.result ? (
          <Results
            result={test.result}
            samples={test.samples}
            // Zen runs and custom snippets are never stored, so they can never
            // be a personal best.
            isPersonalBest={test.isPersonalBest && mode !== "zen" && !test.custom}
            canRepeat={mode !== "zen"}
            quoteSource={session?.quote?.source}
            onRestart={restart}
          />
        ) : (
          <>
            <StatsBar
              mode={mode}
              progress={test.progress}
              live={test.live}
              showLive={settings.liveStats}
              running={phase === "running"}
            />

            <div className={`typing${focused ? "" : " typing--blurred"}`}>
              {session?.kind === "words" && session.words && (
                <WordsView state={session.words} settings={settings} idle={idle} />
              )}
              {session?.kind === "zen" && session.zen && (
                <ZenView state={session.zen} settings={settings} idle={idle} />
              )}
              {session?.kind === "code" && session.code && (
                <CodeView
                  state={session.code}
                  classes={session.codeClasses}
                  settings={settings}
                  idle={idle}
                />
              )}

              {!focused && <p className="typing__overlay">click here or press any key to focus</p>}
            </div>

            <div
              className={`app__actions${
                phase === "running" && mode !== "zen" ? " app__actions--hidden" : ""
              }`}
            >
              {mode === "zen" && phase === "running" ? (
                <button type="button" className="button button--primary" onClick={test.finishZen}>
                  finish
                </button>
              ) : (
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => restart(false)}
                >
                  restart
                </button>
              )}
              {mode !== "zen" && (
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => restart(true)}
                >
                  repeat
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <History results={test.history} onClear={test.clearHistory} />

      <input
        ref={inputRef}
        className="hidden-input"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Typing test input"
        onKeyDown={onKeyDown}
        onInput={onInput}
        onPaste={(event) => event.preventDefault()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}
