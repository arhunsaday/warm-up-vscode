import type { SpeedUnit } from "@shared/settings";
import type { CharCounts, Keystroke } from "./types";

/** One point of the per-second results chart. */
export interface Sample {
  second: number;
  /** Speed during that second, in the test's unit (correct characters only). */
  wpm: number;
  /** Same, counting every keystroke. */
  raw: number;
  errors: number;
}

export interface Stats {
  /** Speed in `unit`. */
  speed: number;
  /** Same, counting every character typed. */
  rawSpeed: number;
  unit: SpeedUnit;
  /** Percentage, 0-100. */
  accuracy: number;
  /** Percentage, 0-100. Lower means a more uneven rhythm. */
  consistency: number;
}

const CHARS_PER_WORD = 5;

/** Characters that make up one unit of speed. */
export function charsPerUnit(unit: SpeedUnit): number {
  return unit === "cpm" ? 1 : CHARS_PER_WORD;
}

/**
 * The standard measure: correct characters divided by five, per minute — or,
 * for languages counted in characters, the characters themselves.
 */
export function speedPerMinute(
  characters: number,
  elapsedMs: number,
  unit: SpeedUnit = "wpm",
): number {
  if (elapsedMs <= 0) {
    return 0;
  }
  return (characters / charsPerUnit(unit) / elapsedMs) * 60_000;
}

/** Buckets keystrokes into one sample per elapsed second. */
export function computeSamples(
  keystrokes: Keystroke[],
  elapsedMs: number,
  unit: SpeedUnit = "wpm",
): Sample[] {
  const seconds = Math.max(1, Math.ceil(elapsedMs / 1000));
  const samples: Sample[] = [];

  for (let second = 1; second <= seconds; second += 1) {
    samples.push({ second, wpm: 0, raw: 0, errors: 0 });
  }

  for (const keystroke of keystrokes) {
    const bucket = Math.min(seconds, Math.max(1, Math.ceil(keystroke.at / 1000)));
    const sample = samples[bucket - 1];
    sample.raw += 1;
    if (keystroke.correct) {
      sample.wpm += 1;
    } else {
      sample.errors += 1;
    }
  }

  const divisor = charsPerUnit(unit);
  return samples.map((sample) => ({
    ...sample,
    wpm: Math.round((sample.wpm / divisor) * 60),
    raw: Math.round((sample.raw / divisor) * 60),
  }));
}

/**
 * Consistency is the coefficient of variation of the per-second raw speed,
 * expressed as a percentage where 100 is a perfectly even rhythm.
 */
export function consistency(samples: Sample[]): number {
  const values = samples.map((sample) => sample.raw);
  if (values.length < 2) {
    return 100;
  }

  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  if (mean === 0) {
    return 0;
  }

  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  const coefficient = Math.sqrt(variance) / mean;

  return clampPercent(100 * (1 - coefficient));
}

export function accuracy(keystrokes: Keystroke[]): number {
  if (keystrokes.length === 0) {
    return 100;
  }
  const correct = keystrokes.filter((keystroke) => keystroke.correct).length;
  return clampPercent((correct / keystrokes.length) * 100);
}

export function computeStats(
  counts: CharCounts,
  keystrokes: Keystroke[],
  elapsedMs: number,
  unit: SpeedUnit = "wpm",
): Stats {
  const samples = computeSamples(keystrokes, elapsedMs, unit);
  const typed = counts.correct + counts.incorrect + counts.extra;

  return {
    unit,
    speed: Math.round(speedPerMinute(counts.correct, elapsedMs, unit)),
    rawSpeed: Math.round(speedPerMinute(typed, elapsedMs, unit)),
    // Floored, never rounded: a run with a mistake must not report 100%.
    accuracy: Math.floor(accuracy(keystrokes)),
    consistency: Math.round(consistency(samples)),
  };
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}
