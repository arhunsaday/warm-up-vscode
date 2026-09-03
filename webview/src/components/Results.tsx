import type { TestResult } from "../../../shared/messages";
import { languageLabel } from "../data";
import type { Sample } from "../engine/stats";
import { WpmChart } from "./WpmChart";

interface ResultsProps {
  result: TestResult;
  samples: Sample[];
  isPersonalBest: boolean;
  onRestart: (keepText: boolean) => void;
}

export function Results({ result, samples, isPersonalBest, onRestart }: ResultsProps) {
  return (
    <section className="results" aria-label="Test results">
      <div className="results__headline">
        <div className="results__hero">
          <span className="results__hero-value">{result.wpm}</span>
          <span className="results__hero-label">wpm</span>
          {isPersonalBest && <span className="badge">personal best</span>}
        </div>
        <div className="results__hero results__hero--secondary">
          <span className="results__hero-value">{result.accuracy}%</span>
          <span className="results__hero-label">accuracy</span>
        </div>
      </div>

      <WpmChart samples={samples} />

      <dl className="results__grid">
        <Stat label="raw" value={`${result.rawWpm}`} hint="every keystroke counted" />
        <Stat label="consistency" value={`${result.consistency}%`} hint="evenness of pace" />
        <Stat
          label="characters"
          value={`${result.correct}/${result.incorrect}/${result.extra}/${result.missed}`}
          hint="correct / wrong / extra / missed"
        />
        <Stat label="time" value={`${(result.durationMs / 1000).toFixed(1)}s`} />
        <Stat
          label="test"
          value={
            result.mode === "code"
              ? `code · ${languageLabel(result.language)}`
              : `${result.mode} ${result.count} · ${languageLabel(result.language)}`
          }
          hint={[result.punctuation && "punctuation", result.numbers && "numbers"]
            .filter(Boolean)
            .join(" · ")}
        />
      </dl>

      <div className="results__actions">
        <button type="button" className="button button--primary" onClick={() => onRestart(false)}>
          next test
        </button>
        <button type="button" className="button" onClick={() => onRestart(true)}>
          repeat this text
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <p className="stat__hint">{hint}</p>}
    </div>
  );
}
