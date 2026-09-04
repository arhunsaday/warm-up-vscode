import { useCallback, useState } from "react";
import type { RunResult } from "../typing/useTypingRun";
import { loadHistory, saveHistory } from "./settings";

/** Identifies comparable runs, so bests are never mixed across modes. */
export function runKey(result: RunResult): string {
  const sized = result.mode === "words" || result.mode === "time";
  return `${result.mode}:${sized ? result.count : "-"}:${result.language}`;
}

export function useResults() {
  const [results, setResults] = useState<RunResult[]>(() => loadHistory<RunResult>());

  const add = useCallback((result: RunResult) => {
    setResults((current) => {
      const next = [result, ...current].slice(0, 300);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    saveHistory([]);
  }, []);

  const bestFor = useCallback(
    (result: RunResult) =>
      results
        .filter((entry) => entry.id !== result.id && runKey(entry) === runKey(result))
        .reduce((best, entry) => Math.max(best, entry.speed), 0),
    [results],
  );

  return { results, add, clear, bestFor };
}
