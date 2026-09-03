import type { Stats } from "../engine/stats";

interface StatsBarProps {
  mode: "words" | "time" | "code";
  progress: { done: number; total: number };
  live: Stats;
  showLive: boolean;
  running: boolean;
}

/** The single line of feedback shown while typing. */
export function StatsBar({ mode, progress, live, showLive, running }: StatsBarProps) {
  const counter =
    mode === "time"
      ? `${progress.done}s`
      : `${progress.done}/${progress.total}${mode === "code" ? " chars" : ""}`;

  return (
    <div className={`stats-bar${running ? " stats-bar--running" : ""}`}>
      <span className="stats-bar__counter" aria-live="off">
        {counter}
      </span>
      {showLive && running && (
        <span className="stats-bar__live">
          <span>{live.wpm} wpm</span>
          <span className="muted">{live.accuracy}% acc</span>
        </span>
      )}
    </div>
  );
}
