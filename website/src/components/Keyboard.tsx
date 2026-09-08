import type { KeyStat } from "../typing/useTypingRun";

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

interface KeyboardProps {
  stats: KeyStat[];
}

/**
 * Which keys you actually miss. The extension records every keystroke against
 * the character it was aiming at, so this is real data rather than decoration.
 */
export function Keyboard({ stats }: KeyboardProps) {
  const byKey = new Map<string, { hits: number; misses: number }>();

  for (const stat of stats) {
    const key = stat.expected.toLowerCase();
    if (!/^[a-z]$/.test(key)) {
      continue;
    }
    const entry = byKey.get(key) ?? { hits: 0, misses: 0 };
    if (stat.correct) {
      entry.hits += 1;
    } else {
      entry.misses += 1;
    }
    byKey.set(key, entry);
  }

  const busiest = Math.max(1, ...[...byKey.values()].map((e) => e.hits + e.misses));

  return (
    <div className="keyboard" aria-hidden="true">
      {ROWS.map((row) => (
        <div className="keyboard__row" key={row.join("")}>
          {row.map((key) => {
            const entry = byKey.get(key);
            const total = entry ? entry.hits + entry.misses : 0;
            const accuracy = total > 0 ? entry!.hits / total : 1;
            const weight = total / busiest;

            return (
              <span
                className={`keyboard__key${total === 0 ? "" : accuracy < 0.9 ? " keyboard__key--missed" : " keyboard__key--used"}`}
                key={key}
                // Weight drives the opacity; the hue comes from the theme.
                style={{ "--weight": total === 0 ? 0 : weight } as React.CSSProperties}
              >
                {key}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
