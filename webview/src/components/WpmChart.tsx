import { useEffect, useRef, useState } from "react";
import type { Sample } from "../engine/stats";

interface WpmChartProps {
  samples: Sample[];
}

const HEIGHT = 190;
const PADDING = { top: 14, right: 14, bottom: 24, left: 38 };

/**
 * Speed over time. Two series on one axis (both are WPM), told apart by line
 * style as well as colour, plus error markers in the reserved status colour.
 * Colours come from VS Code's own `--vscode-charts-*` tokens so the chart is
 * legible in whatever theme the user runs.
 */
export function WpmChart({ samples }: WpmChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<Sample | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  if (samples.length < 2) {
    return null;
  }

  const plotWidth = Math.max(120, width - PADDING.left - PADDING.right);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(10, ...samples.map((sample) => Math.max(sample.raw, sample.wpm)));
  const ceiling = niceCeiling(maxValue);

  const x = (second: number) =>
    PADDING.left + ((second - 1) / Math.max(1, samples.length - 1)) * plotWidth;
  const y = (value: number) => PADDING.top + plotHeight - (value / ceiling) * plotHeight;

  const path = (pick: (sample: Sample) => number) =>
    samples
      .map((sample, index) => `${index === 0 ? "M" : "L"}${x(sample.second)},${y(pick(sample))}`)
      .join(" ");

  const errors = samples.filter((sample) => sample.errors > 0);
  const last = samples[samples.length - 1];
  const ticks = [0, ceiling / 2, ceiling];

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left - PADDING.left) / plotWidth;
    const index = Math.round(ratio * (samples.length - 1));
    setHover(samples[Math.min(samples.length - 1, Math.max(0, index))] ?? null);
  };

  return (
    <div className="chart" ref={containerRef}>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Speed over time: ${samples.length} seconds, peaking at ${Math.max(
          ...samples.map((sample) => sample.wpm),
        )} words per minute.`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <title>Words per minute per second</title>

        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="chart__grid"
              x1={PADDING.left}
              x2={PADDING.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="chart__label" x={PADDING.left - 8} y={y(tick) + 4} textAnchor="end">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        <path className="chart__line chart__line--raw" d={path((sample) => sample.raw)} />
        <path className="chart__line chart__line--wpm" d={path((sample) => sample.wpm)} />

        {errors.map((sample) => (
          <g className="chart__error" key={sample.second}>
            <line
              x1={x(sample.second) - 4}
              y1={y(sample.wpm) - 4}
              x2={x(sample.second) + 4}
              y2={y(sample.wpm) + 4}
            />
            <line
              x1={x(sample.second) - 4}
              y1={y(sample.wpm) + 4}
              x2={x(sample.second) + 4}
              y2={y(sample.wpm) - 4}
            />
          </g>
        ))}

        <text className="chart__value" x={x(last.second)} y={y(last.wpm) - 10} textAnchor="end">
          {last.wpm}
        </text>

        <text className="chart__label" x={PADDING.left} y={HEIGHT - 6}>
          1s
        </text>
        <text className="chart__label" x={PADDING.left + plotWidth} y={HEIGHT - 6} textAnchor="end">
          {samples.length}s
        </text>

        {hover && (
          <line
            className="chart__crosshair"
            x1={x(hover.second)}
            x2={x(hover.second)}
            y1={PADDING.top}
            y2={PADDING.top + plotHeight}
          />
        )}
      </svg>

      {hover && (
        <div
          className="chart__tooltip"
          style={{ left: Math.min(x(hover.second) + 12, width - 130) }}
        >
          <strong>{hover.second}s</strong>
          <span>{hover.wpm} wpm</span>
          <span className="muted">{hover.raw} raw</span>
          {hover.errors > 0 && <span className="chart__tooltip-error">{hover.errors} errors</span>}
        </div>
      )}

      <ul className="chart__legend">
        <li>
          <span className="swatch swatch--wpm" /> wpm
        </li>
        <li>
          <span className="swatch swatch--raw" /> raw
        </li>
        <li>
          <span className="swatch swatch--error" /> errors
        </li>
      </ul>
    </div>
  );
}

/** Rounds the axis top up to something readable (20, 40, 50, 100...). */
function niceCeiling(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}
