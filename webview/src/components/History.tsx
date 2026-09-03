import { useMemo, useState } from "react";
import { type TestResult, resultKey } from "../../../shared/messages";
import { languageLabel } from "../data";

interface HistoryProps {
  results: TestResult[];
  onClear: () => void;
}

/**
 * Local leaderboard: personal bests per configuration, plus the recent runs.
 * Everything stays on the machine — there is no server to send scores to.
 */
export function History({ results, onClear }: HistoryProps) {
  const [open, setOpen] = useState(false);

  const bests = useMemo(() => {
    const map = new Map<string, TestResult>();
    for (const result of results) {
      const key = resultKey(result);
      const current = map.get(key);
      if (!current || result.wpm > current.wpm) {
        map.set(key, result);
      }
    }
    return [...map.values()].sort((a, b) => b.wpm - a.wpm).slice(0, 8);
  }, [results]);

  const average = useMemo(() => {
    const recent = results.slice(0, 10);
    if (recent.length === 0) {
      return null;
    }
    return Math.round(recent.reduce((total, result) => total + result.wpm, 0) / recent.length);
  }, [results]);

  if (results.length === 0) {
    return null;
  }

  return (
    <section className="history">
      <button
        type="button"
        className="history__summary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span>
          {results.length} tests · last 10 average {average} wpm
        </span>
        <span className="history__chevron">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="history__body">
          <table className="history__table">
            <caption>Personal bests</caption>
            <thead>
              <tr>
                <th scope="col">test</th>
                <th scope="col">wpm</th>
                <th scope="col">accuracy</th>
                <th scope="col">date</th>
              </tr>
            </thead>
            <tbody>
              {bests.map((best) => (
                <tr key={best.id}>
                  <th scope="row">
                    {best.mode === "code"
                      ? `code · ${languageLabel(best.language)}`
                      : `${best.mode} ${best.count} · ${languageLabel(best.language)}`}
                  </th>
                  <td>{best.wpm}</td>
                  <td>{best.accuracy}%</td>
                  <td>{new Date(best.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" className="button button--quiet" onClick={onClear}>
            clear history
          </button>
        </div>
      )}
    </section>
  );
}
