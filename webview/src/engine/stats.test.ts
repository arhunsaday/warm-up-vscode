import { describe, expect, it } from "vitest";
import { accuracy, computeSamples, computeStats, consistency, wordsPerMinute } from "./stats";
import type { Keystroke } from "./types";

function keystrokes(pattern: (0 | 1)[], spacingMs = 100): Keystroke[] {
  return pattern.map((correct, index) => ({
    at: (index + 1) * spacingMs,
    correct: correct === 1,
  }));
}

describe("stats", () => {
  it("computes words per minute from correct characters", () => {
    // 60 characters = 12 words, in 60 seconds.
    expect(wordsPerMinute(60, 60_000)).toBe(12);
  });

  it("returns zero words per minute for a zero-length test", () => {
    expect(wordsPerMinute(10, 0)).toBe(0);
  });

  it("computes accuracy from keystrokes", () => {
    expect(accuracy(keystrokes([1, 1, 1, 0]))).toBe(75);
    expect(accuracy([])).toBe(100);
  });

  it("buckets keystrokes into one sample per second", () => {
    const samples = computeSamples(keystrokes([1, 1, 1, 1, 1], 400), 2000);

    expect(samples).toHaveLength(2);
    expect(samples[0].raw).toBe(Math.round((2 / 5) * 60));
    expect(samples[1].raw).toBe(Math.round((3 / 5) * 60));
  });

  it("reports perfect consistency for an even rhythm", () => {
    expect(
      consistency([
        { second: 1, wpm: 60, raw: 60, errors: 0 },
        { second: 2, wpm: 60, raw: 60, errors: 0 },
      ]),
    ).toBe(100);
  });

  it("reports lower consistency for an uneven rhythm", () => {
    const value = consistency([
      { second: 1, wpm: 20, raw: 20, errors: 0 },
      { second: 2, wpm: 100, raw: 100, errors: 0 },
    ]);

    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(50);
  });

  it("never reports 100% accuracy when a keystroke was wrong", () => {
    const pattern = Array.from({ length: 500 }, (_, index) => (index === 0 ? 0 : 1)) as (0 | 1)[];
    const stats = computeStats(
      { correct: 499, incorrect: 1, extra: 0, missed: 0 },
      keystrokes(pattern),
      60_000,
    );

    expect(stats.accuracy).toBe(99);
  });

  it("puts a whole run together", () => {
    const stats = computeStats(
      { correct: 50, incorrect: 5, extra: 0, missed: 0 },
      keystrokes([1, 1, 1, 1, 0], 200),
      30_000,
    );

    expect(stats.wpm).toBe(20);
    expect(stats.rawWpm).toBe(22);
    expect(stats.accuracy).toBe(80);
    expect(stats.consistency).toBeGreaterThanOrEqual(0);
  });
});
