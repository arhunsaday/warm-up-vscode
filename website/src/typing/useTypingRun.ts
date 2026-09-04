import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SpeedUnit, type WarmUpSettings, speedUnitFor } from "@shared/settings";
import {
  backspace as codeBackspace,
  tab as codeTab,
  typeChar as codeTypeChar,
  typeableLength,
  typedLength,
} from "@core/engine/code";
import {
  type Session,
  createSession,
  needsMoreWords,
  sessionCounts,
  topUpWords,
} from "@core/engine/session";
import { type Sample, type Stats, computeSamples, computeStats } from "@core/engine/stats";
import type { Keystroke } from "@core/engine/types";
import {
  backspace as wordsBackspace,
  wordsCompleted,
  typeChar as wordsTypeChar,
} from "@core/engine/words";
import {
  backspace as zenBackspace,
  finish as zenFinish,
  typeChar as zenTypeChar,
  zenWordCount,
} from "@core/engine/zen";
import { sounds } from "@core/sound";

/**
 * Speed is characters over time, so the first keystroke of a run divides by a
 * few milliseconds and flashes an absurd number. Live figures are therefore
 * computed over at least a second; finished results use the real duration.
 */
const LIVE_FLOOR_MS = 1000;

/** Below this, the run was pasted or automated rather than typed. */
export const MIN_CREDIBLE_MS = 800;

/** One keystroke, remembered with what it was aiming at, for the heatmap. */
export interface KeyStat {
  expected: string;
  correct: boolean;
}

export interface RunResult {
  id: string;
  date: number;
  mode: WarmUpSettings["mode"];
  language: string;
  count: number;
  speed: number;
  rawSpeed: number;
  unit: SpeedUnit;
  accuracy: number;
  consistency: number;
  durationMs: number;
}

export interface TypingRun {
  session: Session | null;
  running: boolean;
  finished: boolean;
  stats: Stats;
  samples: Sample[];
  progress: { done: number; total: number; label: string };
  secondsLeft: number | null;
  credible: boolean;
  keyStats: KeyStat[];
  result: RunResult | null;
  restart: (keepText?: boolean) => void;
  typeChar: (char: string) => void;
  backspace: (wholeWord: boolean) => void;
  tab: () => void;
  finishZen: () => void;
}

export interface RunOptions {
  settings: WarmUpSettings;
  /** A fixed word list, used by the landing page headline. */
  fixedWords?: string[];
  onFinished?: (result: RunResult) => void;
}

/**
 * Drives one typing surface in the browser. A thin adapter over the same engine
 * the extension uses — the session building, the engines and the statistics all
 * live in `core`.
 */
export function useTypingRun({ settings, fixedWords, onFinished }: RunOptions): TypingRun {
  const [session, setSession] = useState<Session | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [keyStats, setKeyStats] = useState<KeyStat[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);

  const startedAt = useRef(0);
  const keystrokes = useRef<Keystroke[]>([]);
  const finishing = useRef(false);

  /**
   * Several characters can arrive from a single `input` event and React batches
   * them into one render, so handlers read and write through a ref — otherwise
   * every keystroke but the last is silently lost.
   */
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const apply = useCallback((next: Session) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const restart = useCallback(
    (keepText = false) => {
      keystrokes.current = [];
      startedAt.current = 0;
      finishing.current = false;
      setElapsedMs(0);
      setKeyStats([]);
      setSamples([]);
      setResult(null);
      setRunning(false);
      setFinished(false);
      apply(
        createSession(settingsRef.current, {
          reuse: keepText ? sessionRef.current : null,
          fixedWords,
        }),
      );
    },
    [apply, fixedWords],
  );

  // A new run whenever anything that shapes the text changes.
  const textKey = [
    settings.mode,
    settings.language,
    settings.programmingLanguage,
    settings.count,
    settings.punctuation,
    settings.numbers,
    settings.quoteLength,
    fixedWords?.join(" ") ?? "",
  ].join("|");

  // biome-ignore lint/correctness/useExhaustiveDependencies: `textKey` digests the deps.
  useEffect(() => {
    restart(false);
  }, [textKey]);

  useEffect(() => {
    sounds.configure({
      pack: settings.sound,
      volume: settings.volume,
      errorSound: settings.errorSound,
    });
  }, [settings.sound, settings.volume, settings.errorSound]);

  const finish = useCallback((done: Session, durationMs: number) => {
    if (finishing.current) {
      return;
    }
    finishing.current = true;

    const current = settingsRef.current;
    const unit = speedUnitFor(done.label);
    const counts = sessionCounts(done);
    const stats = computeStats(counts, keystrokes.current, Math.max(durationMs, 1), unit);

    const runResult: RunResult = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: Date.now(),
      mode: current.mode,
      language: done.label,
      count: current.mode === "words" || current.mode === "time" ? current.count : 0,
      durationMs,
      ...stats,
    };

    setSamples(computeSamples(keystrokes.current, Math.max(durationMs, 1), unit));
    setResult(runResult);
    setElapsedMs(durationMs);
    setFinished(true);
    setRunning(false);
    sounds.finish();

    // Free typing has nothing to compare against, so it is never recorded.
    if (current.mode !== "zen" && durationMs >= MIN_CREDIBLE_MS) {
      onFinishedRef.current?.(runResult);
    }
  }, []);

  useEffect(() => {
    if (!running) {
      return;
    }
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      setElapsedMs(elapsed);
      if (settingsRef.current.mode === "time" && elapsed >= settingsRef.current.count * 1000) {
        if (sessionRef.current) {
          finish(sessionRef.current, settingsRef.current.count * 1000);
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running, finish]);

  const typeChar = useCallback(
    (char: string) => {
      const current = sessionRef.current;
      if (!current || finished) {
        return;
      }

      const now = Date.now();
      if (startedAt.current === 0) {
        startedAt.current = now;
        setRunning(true);
      }
      const at = now - startedAt.current;
      const options = { stopOnError: settingsRef.current.stopOnError };
      const mode = settingsRef.current.mode;

      let next: Session;
      let outcome: "correct" | "incorrect" | "ignored";
      let done = false;
      let expected: string | undefined;

      if (current.kind === "zen" && current.zen) {
        next = { ...current, zen: zenTypeChar(current.zen, char) };
        outcome = "correct";
      } else if (current.kind === "code" && current.code) {
        expected = current.code.target[current.code.index];
        const step = codeTypeChar(current.code, char, options);
        next = { ...current, code: step.state };
        outcome = step.outcome;
        done = step.state.finished;
      } else if (current.words) {
        const active = current.words.words[current.words.active] ?? "";
        expected = char === " " ? " " : active[(current.words.typed[current.words.active] ?? "").length];
        const step = wordsTypeChar(current.words, char, options);
        let words = step.state;
        if (mode === "time" && needsMoreWords(words)) {
          words = topUpWords(words, settingsRef.current);
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
      if (expected) {
        setKeyStats((stats) => [...stats, { expected, correct: outcome === "correct" }]);
      }
      sounds.press(outcome === "correct");
      apply(next);

      if (done) {
        finish(next, at);
      }
    },
    [finished, apply, finish],
  );

  const backspace = useCallback(
    (wholeWord: boolean) => {
      const current = sessionRef.current;
      if (!current || finished) {
        return;
      }
      if (current.kind === "zen" && current.zen) {
        apply({ ...current, zen: zenBackspace(current.zen, wholeWord) });
      } else if (current.kind === "code" && current.code) {
        apply({ ...current, code: codeBackspace(current.code, wholeWord) });
      } else if (current.words) {
        apply({ ...current, words: wordsBackspace(current.words, wholeWord) });
      }
    },
    [finished, apply],
  );

  const tab = useCallback(() => {
    const current = sessionRef.current;
    if (current?.kind === "code" && current.code) {
      apply({ ...current, code: codeTab(current.code) });
    }
  }, [apply]);

  const finishZen = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.kind !== "zen" || !current.zen || !running) {
      return;
    }
    const next: Session = { ...current, zen: zenFinish(current.zen) };
    apply(next);
    finish(next, Date.now() - startedAt.current);
  }, [running, apply, finish]);

  const measuredMs = finished ? Math.max(elapsedMs, 1) : Math.max(elapsedMs, LIVE_FLOOR_MS);

  const stats = useMemo<Stats>(() => {
    if (!session) {
      return { speed: 0, rawSpeed: 0, unit: "wpm", accuracy: 100, consistency: 100 };
    }
    return computeStats(
      sessionCounts(session),
      keystrokes.current,
      measuredMs,
      speedUnitFor(session.label),
    );
  }, [session, measuredMs]);

  const secondsLeft =
    settings.mode === "time" ? Math.max(0, settings.count - Math.floor(elapsedMs / 1000)) : null;

  const progress = useMemo(() => {
    if (!session) {
      return { done: 0, total: 0, label: "" };
    }
    if (session.kind === "zen" && session.zen) {
      const done = zenWordCount(session.zen);
      return { done, total: 0, label: `${done} ${done === 1 ? "word" : "words"}` };
    }
    if (session.kind === "code" && session.code) {
      const done = typedLength(session.code);
      const total = typeableLength(session.code);
      return { done, total, label: `${done}/${total} chars` };
    }
    if (session.words) {
      if (secondsLeft !== null) {
        return { done: secondsLeft, total: settings.count, label: `${secondsLeft}s` };
      }
      const total = session.words.words.length;
      const done = finished ? total : wordsCompleted(session.words);
      return { done, total, label: `${done}/${total}` };
    }
    return { done: 0, total: 0, label: "" };
  }, [session, secondsLeft, settings.count, finished]);

  return {
    session,
    running,
    finished,
    stats,
    samples,
    progress,
    secondsLeft,
    credible: !finished || elapsedMs >= MIN_CREDIBLE_MS,
    keyStats,
    result,
    restart,
    typeChar,
    backspace,
    tab,
    finishZen,
  };
}
