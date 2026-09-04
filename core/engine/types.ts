/** How a single character of the target text is rendered and counted. */
export type CharState =
  | "pending"
  /** Typed correctly. */
  | "correct"
  /** Typed, but wrong. */
  | "incorrect"
  /** Typed on top of a finished word (monkeytype-style overflow). */
  | "extra"
  /** Never typed, because the user moved on. */
  | "missed"
  /** Auto-advanced indentation in code mode; excluded from every statistic. */
  | "skipped";

/** One keystroke, used for accuracy and for the per-second chart. */
export interface Keystroke {
  /** Milliseconds since the test started. */
  at: number;
  correct: boolean;
}

export interface CharCounts {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
}

/**
 * What an engine did with a keystroke. `incorrect` covers both "recorded as a
 * mistake" and "rejected because stop-on-error is enabled" — in both cases the
 * user pressed the wrong key. `ignored` keystrokes never reach the statistics.
 */
export type Outcome = "correct" | "incorrect" | "ignored";

export interface Step<S> {
  state: S;
  outcome: Outcome;
}

export const EMPTY_COUNTS: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0 };
