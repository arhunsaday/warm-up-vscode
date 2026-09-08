import type { Stats } from "@core/engine/stats";
import type { TypingMode } from "@shared/settings";

interface StatsBarProps {
  mode: TypingMode;
  progress: { done: number; total: number };
  live: Stats;
  showLive: boolean;
  running: boolean;
}

/** The single line of feedback shown while typing. */
export function StatsBar({ mode, progress, live, showLive, running }: StatsBarProps) {
  const counter = counterFor(mode, progress);

  return (
    <div className={`stats-bar${running ? " stats-bar--running" : ""}`}>
      <span className="stats-bar__counter" aria-live="off">
        {counter}
      </span>
      {showLive && running && (
        <span className="stats-bar__live">
          <span>
            {live.speed} {live.unit}
          </span>
          {mode !== "zen" && <span className="muted">{live.accuracy}% acc</span>}
        </span>
      )}
    </div>
  );
}

function counterFor(mode: TypingMode, progress: { done: number; total: number }): string {
  switch (mode) {
    case "time":
      return `${progress.done}s`;
    case "code":
      return `${progress.done}/${progress.total} chars`;
    case "zen":
      return `${progress.done} ${progress.done === 1 ? "word" : "words"}`;
    default:
      return `${progress.done}/${progress.total}`;
  }
}
