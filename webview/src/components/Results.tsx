import { languageLabel } from "@core/data";
import type { Sample } from "@core/engine/stats";
import type { TestResult } from "@shared/messages";
import { WpmChart } from "@ui/WpmChart";

interface ResultsProps {
  result: TestResult;
  samples: Sample[];
  isPersonalBest: boolean;
  /** Attribution, when the run was a quote. */
  quoteSource?: string;
  /** Free typing has no text to repeat. */
  canRepeat: boolean;
  onRestart: (keepText: boolean) => void;
}

export function Results({
  result,
  samples,
  isPersonalBest,
  quoteSource,
  canRepeat,
  onRestart,
}: ResultsProps) {
  return (
    <section className="results" aria-label="Test results">
      <div className="results__headline">
        <div className="results__hero">
          <span className="results__hero-value">{result.speed}</span>
          <span className="results__hero-label">{result.unit}</span>
          {isPersonalBest && <span className="badge">personal best</span>}
        </div>
        {result.mode !== "zen" && (
          <div className="results__hero results__hero--secondary">
            <span className="results__hero-value">{result.accuracy}%</span>
            <span className="results__hero-label">accuracy</span>
          </div>
        )}
      </div>

      {quoteSource && <p className="results__quote-source">— {quoteSource}</p>}

      <WpmChart samples={samples} unit={result.unit} />

      <dl className="results__grid">
        <Stat label="raw" value={`${result.rawSpeed}`} hint="every character counted" />
        <Stat label="consistency" value={`${result.consistency}%`} hint="evenness of pace" />
        <Stat
          label="characters"
          value={`${result.correct}/${result.incorrect}/${result.extra}/${result.missed}`}
          hint="correct / wrong / extra / missed"
        />
        <Stat label="time" value={`${(result.durationMs / 1000).toFixed(1)}s`} />
        <Stat
          label="test"
          value={describeTest(result)}
          hint={[result.punctuation && "punctuation", result.numbers && "numbers"]
            .filter(Boolean)
            .join(" · ")}
        />
      </dl>

      <div className="results__actions">
        <button type="button" className="button button--primary" onClick={() => onRestart(false)}>
          next test
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

function describeTest(result: TestResult): string {
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <p className="stat__hint">{hint}</p>}
    </div>
  );
}
