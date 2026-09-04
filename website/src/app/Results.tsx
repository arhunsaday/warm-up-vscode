import { WpmChart } from "@ui/WpmChart";
import { languageLabel } from "@core/data";
import type { Sample } from "@core/engine/stats";
import { Keyboard } from "../components/Keyboard";
import type { KeyStat, RunResult } from "../typing/useTypingRun";

interface ResultsProps {
  result: RunResult;
  samples: Sample[];
  keyStats: KeyStat[];
  previousBest: number;
  quoteSource?: string;
  credible: boolean;
  canRepeat: boolean;
  onRestart: (keepText?: boolean) => void;
}

export function Results({
  result,
  samples,
  keyStats,
  previousBest,
  quoteSource,
  credible,
  canRepeat,
  onRestart,
}: ResultsProps) {
  const isBest = credible && result.mode !== "zen" && result.speed > previousBest;

  return (
    <section className="results" aria-label="Results">
      <div className="results__top">
        <div className="results__hero">
          <span className="results__value">{credible ? result.speed : "—"}</span>
          <span className="results__unit">{result.unit}</span>
          {isBest && <span className="badge">personal best</span>}
          {!credible && <span className="results__note">too fast to measure</span>}
        </div>

        {result.mode !== "zen" && (
          <div className="results__hero results__hero--minor">
            <span className="results__value">{result.accuracy}%</span>
            <span className="results__unit">accuracy</span>
          </div>
        )}
      </div>

      {quoteSource && <p className="results__source">— {quoteSource}</p>}

      <WpmChart samples={samples} unit={result.unit} />

      <dl className="results__grid">
        <Stat label="raw" value={credible ? result.rawSpeed : "—"} />
        <Stat label="consistency" value={`${result.consistency}%`} />
        <Stat label="time" value={`${(result.durationMs / 1000).toFixed(1)}s`} />
        <Stat label="test" value={describe(result)} />
        {previousBest > 0 && <Stat label="best" value={`${previousBest} ${result.unit}`} />}
      </dl>

      {keyStats.length > 0 && (
        <div className="results__keys">
          <p className="results__caption">keys you missed</p>
          <Keyboard stats={keyStats} />
        </div>
      )}

      <div className="results__actions">
        <button type="button" className="button button--primary" onClick={() => onRestart(false)}>
          next test <kbd>tab</kbd>
        </button>
        {canRepeat && (
          <button type="button" className="button" onClick={() => onRestart(true)}>
            repeat this text
          </button>
        )}
      </div>
    </section>
  );
}

function describe(result: RunResult): string {
  const language = languageLabel(result.language);
  switch (result.mode) {
    case "zen":
      return "zen";
    case "code":
      return `code · ${language}`;
    case "quotes":
      return `quote · ${language}`;
    default:
      return `${result.mode} ${result.count} · ${language}`;
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
