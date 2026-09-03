import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type CustomText, type TestResult, resultKey } from "../../../shared/messages";
import { DEFAULT_SETTINGS, type SettingKey, type WarmUpSettings } from "../../../shared/settings";
import { SNIPPETS, WORDS } from "../data";
import {
  type CodeState,
  backspace as codeBackspace,
  codeCounts,
  tab as codeTab,
  typeChar as codeTypeChar,
  createCodeState,
  typeableLength,
  typedLength,
} from "../engine/code";
import { generateWords, normalizeCode, pickSnippet } from "../engine/generator";
import { type Sample, type Stats, computeSamples, computeStats } from "../engine/stats";
import type { CharCounts, Keystroke } from "../engine/types";
import {
  type WordsState,
  appendWords,
  createWordsState,
  backspace as wordsBackspace,
  wordsCompleted,
  wordsCounts,
  typeChar as wordsTypeChar,
} from "../engine/words";
import { tokenizeToChars } from "../highlight";
import { sounds } from "../sound";
import { getState, onHostMessage, setState as persistState, postMessage } from "../vscodeApi";

export type Phase = "idle" | "running" | "finished";

/** Words generated ahead of the caret in time mode. */
const TIME_MODE_BUFFER = 60;

export interface Session {
  kind: "words" | "code";
  words: WordsState | null;
  code: CodeState | null;
  /** Prism token class per character, aligned with `code.target`. */
  codeClasses: string[];
  /** Shown in the toolbar: language name, or where a custom snippet came from. */
  label: string;
}

export interface TypingTest {
  settings: WarmUpSettings;
  phase: Phase;
  session: Session | null;
  custom: CustomText | null;
  elapsedMs: number;
  live: Stats;
  progress: { done: number; total: number };
  result: TestResult | null;
  samples: Sample[];
  history: TestResult[];
  isPersonalBest: boolean;
  handleChar: (char: string) => void;
  handleBackspace: (wholeWord: boolean) => void;
  handleTab: () => void;
  restart: (keepText: boolean) => void;
  exitCustom: () => void;
  openSettings: () => void;
  updateSetting: <K extends SettingKey>(key: K, value: WarmUpSettings[K]) => void;
  clearHistory: () => void;
}

export function useTypingTest(): TypingTest {
  const restored = useMemo(() => getState(), []);

  const [settings, setSettings] = useState<WarmUpSettings>(restored?.settings ?? DEFAULT_SETTINGS);
  const [history, setHistory] = useState<TestResult[]>(restored?.history ?? []);
  const [custom, setCustom] = useState<CustomText | null>(restored?.customText ?? null);
  const [session, setSession] = useState<Session | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);

  /**
   * Mirrors `session` so keystrokes can be applied synchronously: several
   * characters can arrive from a single `input` event, and state updaters must
   * stay free of side effects.
   */
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const startedAt = useRef(0);
  const keystrokes = useRef<Keystroke[]>([]);
  const finishing = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  /** Words and time modes ignore custom text; a snippet always plays as code. */
  const mode = custom ? "code" : settings.mode;

  // ---------------------------------------------------------------- host wiring

  useEffect(() => {
    postMessage({ type: "ready" });

    return onHostMessage((message) => {
      switch (message.type) {
        case "settings":
          setSettings(message.settings);
          break;
        case "history":
          setHistory(message.results);
          break;
        case "customText":
          setCustom(message.payload);
          break;
        case "focus":
          window.dispatchEvent(new CustomEvent("warmup:focus"));
          break;
      }
    });
  }, []);

  useEffect(() => {
    // The host is the source of truth for results; this copy only exists so a
    // restored panel can render before the host answers.
    persistState({ settings, history: history.slice(0, 20), customText: custom ?? undefined });
  }, [settings, history, custom]);

  useEffect(() => {
    sounds.configure({
      pack: settings.sound,
      volume: settings.volume,
      errorSound: settings.errorSound,
    });
  }, [settings.sound, settings.volume, settings.errorSound]);

  // ------------------------------------------------------------------- session

  const buildSession = useCallback(
    (previous: Session | null, keepText: boolean): Session => {
      const current = settingsRef.current;

      if (mode === "code") {
        const languageId = custom?.languageId ?? current.programmingLanguage;
        const target =
          keepText && previous?.code
            ? previous.code.target
            : custom
              ? normalizeCode(custom.text)
              : pickSnippet(SNIPPETS[current.programmingLanguage] ?? []);

        return {
          kind: "code",
          words: null,
          code: createCodeState(target),
          codeClasses: tokenizeToChars(target, languageId),
          label: custom ? custom.origin : current.programmingLanguage,
        };
      }

      const pool = WORDS[current.language] ?? WORDS.english;
      const count = mode === "time" ? TIME_MODE_BUFFER : current.count;
      const words =
        keepText && previous?.words
          ? previous.words.words
          : generateWords(pool, count, {
              punctuation: current.punctuation,
              numbers: current.numbers,
            });

      return {
        kind: "words",
        words: createWordsState(words),
        code: null,
        codeClasses: [],
        label: current.language,
      };
    },
    [custom, mode],
  );

  const restart = useCallback(
    (keepText: boolean) => {
      keystrokes.current = [];
      startedAt.current = 0;
      finishing.current = false;
      setElapsedMs(0);
      setResult(null);
      setSamples([]);
      setPhase("idle");

      const next = buildSession(sessionRef.current, keepText);
      sessionRef.current = next;
      setSession(next);
    },
    [buildSession],
  );

  // A new run whenever anything that shapes the text changes.
  const textKey = [
    mode,
    settings.language,
    settings.programmingLanguage,
    settings.count,
    settings.punctuation,
    settings.numbers,
    custom?.text ?? "",
  ].join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: `textKey` is the digest of the deps.
  useEffect(() => {
    restart(false);
  }, [textKey]);

  // --------------------------------------------------------------------- finish

  const finish = useCallback(
    (finished: Session, durationMs: number) => {
      if (finishing.current) {
        return;
      }
      finishing.current = true;

      const counts: CharCounts =
        finished.kind === "words" && finished.words
          ? wordsCounts(finished.words)
          : finished.code
            ? codeCounts(finished.code)
            : { correct: 0, incorrect: 0, extra: 0, missed: 0 };

      const stats = computeStats(counts, keystrokes.current, durationMs);
      const current = settingsRef.current;

      const testResult: TestResult = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: Date.now(),
        mode,
        language: finished.label,
        count: mode === "code" ? 0 : current.count,
        punctuation: current.punctuation,
        numbers: current.numbers,
        durationMs,
        ...stats,
        ...counts,
      };

      setSamples(computeSamples(keystrokes.current, durationMs));
      setResult(testResult);
      setElapsedMs(durationMs);
      setPhase("finished");
      sounds.finish();

      // Custom snippets are one-offs; they should not pollute personal bests.
      if (!custom) {
        postMessage({ type: "saveResult", result: testResult });
      }
    },
    [custom, mode],
  );

  // ---------------------------------------------------------------------- timer

  useEffect(() => {
    if (phase !== "running") {
      return;
    }

    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      setElapsedMs(elapsed);

      if (mode === "time" && elapsed >= settingsRef.current.count * 1000 && sessionRef.current) {
        finish(sessionRef.current, settingsRef.current.count * 1000);
      }
    }, 100);

    return () => window.clearInterval(id);
  }, [phase, mode, finish]);

  // ---------------------------------------------------------------------- input

  const handleChar = useCallback(
    (char: string) => {
      const current = sessionRef.current;
      if (!current || phase === "finished") {
        return;
      }

      const now = Date.now();
      if (startedAt.current === 0) {
        startedAt.current = now;
        setPhase("running");
      }
      const at = now - startedAt.current;
      const options = { stopOnError: settingsRef.current.stopOnError };

      let next: Session;
      let outcome: "correct" | "incorrect" | "ignored";
      let done: boolean;

      if (current.kind === "code" && current.code) {
        const step = codeTypeChar(current.code, char, options);
        next = { ...current, code: step.state };
        outcome = step.outcome;
        done = step.state.finished;
      } else if (current.words) {
        const step = wordsTypeChar(current.words, char, options);
        let words = step.state;

        // Time mode never runs out of words.
        if (mode === "time" && words.words.length - words.active < TIME_MODE_BUFFER / 2) {
          const settings = settingsRef.current;
          words = appendWords(
            words,
            generateWords(WORDS[settings.language] ?? WORDS.english, TIME_MODE_BUFFER, {
              punctuation: settings.punctuation,
              numbers: settings.numbers,
            }),
          );
          words = { ...words, finished: false };
        }

        next = { ...current, words };
        outcome = step.outcome;
        done = words.finished && mode !== "time";
      } else {
        return;
      }

      if (outcome === "ignored") {
        return;
      }

      keystrokes.current.push({ at, correct: outcome === "correct" });
      sounds.press(outcome === "correct");

      sessionRef.current = next;
      setSession(next);

      if (done) {
        finish(next, at);
      }
    },
    [phase, mode, finish],
  );

  const handleBackspace = useCallback(
    (wholeWord: boolean) => {
      const current = sessionRef.current;
      if (!current || phase === "finished") {
        return;
      }

      const next: Session =
        current.kind === "code" && current.code
          ? { ...current, code: codeBackspace(current.code, wholeWord) }
          : current.words
            ? { ...current, words: wordsBackspace(current.words, wholeWord) }
            : current;

      sessionRef.current = next;
      setSession(next);
    },
    [phase],
  );

  const handleTab = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.kind !== "code" || !current.code) {
      return;
    }

    const next: Session = { ...current, code: codeTab(current.code) };
    sessionRef.current = next;
    setSession(next);
  }, []);

  // -------------------------------------------------------------------- derived

  const live = useMemo<Stats>(() => {
    if (!session) {
      return { wpm: 0, rawWpm: 0, accuracy: 100, consistency: 100 };
    }
    const counts =
      session.kind === "words" && session.words
        ? wordsCounts(session.words)
        : session.code
          ? codeCounts(session.code)
          : { correct: 0, incorrect: 0, extra: 0, missed: 0 };

    return computeStats(counts, keystrokes.current, Math.max(elapsedMs, 1));
  }, [session, elapsedMs]);

  const progress = useMemo(() => {
    if (!session) {
      return { done: 0, total: 0 };
    }
    if (session.kind === "code" && session.code) {
      return { done: typedLength(session.code), total: typeableLength(session.code) };
    }
    if (mode === "time") {
      const remaining = Math.max(0, settings.count - Math.floor(elapsedMs / 1000));
      return { done: remaining, total: settings.count };
    }
    return { done: wordsCompleted(session.words!), total: session.words!.words.length };
  }, [session, mode, settings.count, elapsedMs]);

  const isPersonalBest = useMemo(() => {
    if (!result) {
      return false;
    }
    const key = resultKey(result);
    return !history.some(
      (entry) => entry.id !== result.id && resultKey(entry) === key && entry.wpm >= result.wpm,
    );
  }, [result, history]);

  const updateSetting = useCallback(<K extends SettingKey>(key: K, value: WarmUpSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    postMessage({ type: "updateSetting", key, value });
  }, []);

  const exitCustom = useCallback(() => setCustom(null), []);
  const openSettings = useCallback(() => postMessage({ type: "openSettings" }), []);
  const clearHistory = useCallback(() => postMessage({ type: "clearHistory" }), []);

  return {
    settings,
    phase,
    session,
    custom,
    elapsedMs,
    live,
    progress,
    result,
    samples,
    history,
    isPersonalBest,
    handleChar,
    handleBackspace,
    handleTab,
    restart,
    exitCustom,
    openSettings,
    updateSetting,
    clearHistory,
  };
}
