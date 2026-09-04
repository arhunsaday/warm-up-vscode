import { useMemo, useState } from "react";
import { languageLabel } from "@core/data";
import type { RunResult } from "../typing/useTypingRun";
import { runKey } from "./useResults";

interface HistoryProps {
  results: RunResult[];
  onClear: () => void;
}

/** Personal bests and recent runs, kept in this browser only. */
export function History({ results, onClear }: HistoryProps) {
  const [open, setOpen] = useState(false);

  const bests = useMemo(() => {
    const map = new Map<string, RunResult>();
    for (const result of results) {
      const key = runKey(result);
      const current = map.get(key);
      if (!current || result.speed > current.speed) {
        map.set(key, result);
      }
    }
    return [...map.values()].sort((a, b) => b.speed - a.speed).slice(0, 10);
  }, [results]);

  const average = useMemo(() => {
    const recent = results.slice(0, 10).filter((result) => Number.isFinite(result.speed));
    if (recent.length === 0) {
      return null;
    }
    return Math.round(recent.reduce((total, r) => total + r.speed, 0) / recent.length);
  }, [results]);

  if (results.length === 0) {
    return null;
  }

  return (
    <section className="history">
      <button
        type="button"
        className="history__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {results.length} {results.length === 1 ? "test" : "tests"}
          {average !== null && ` · last 10 average ${average} ${results[0].unit}`}
        </span>
        <span className={`history__chevron${open ? " history__chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="history__body">
          <table className="history__table">
            <caption>Personal bests</caption>
            <thead>
              <tr>
                <th scope="col">test</th>
                <th scope="col">speed</th>
                <th scope="col">accuracy</th>
                <th scope="col">when</th>
              </tr>
            </thead>
            <tbody>
              {bests.map((best) => (
                <tr key={best.id}>
                  <th scope="row">
                    {best.mode === "words" || best.mode === "time"
                      ? `${best.mode} ${best.count} · ${languageLabel(best.language)}`
                      : `${best.mode} · ${languageLabel(best.language)}`}
                  </th>
                  <td>
                    {best.speed} {best.unit}
                  </td>
                  <td>{best.accuracy}%</td>
                  <td>{new Date(best.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" className="ghost-button" onClick={onClear}>
            clear history
          </button>
        </div>
      )}
    </section>
  );
}
