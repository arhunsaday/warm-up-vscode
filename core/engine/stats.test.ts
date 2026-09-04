import { speedUnitFor } from "@shared/settings";
import { describe, expect, it } from "vitest";
import { accuracy, computeSamples, computeStats, consistency, speedPerMinute } from "./stats";
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
    expect(speedPerMinute(60, 60_000)).toBe(12);
  });

  it("counts characters per minute for languages measured that way", () => {
    expect(speedPerMinute(60, 60_000, "cpm")).toBe(60);
  });

  it("returns zero speed for a zero-length test", () => {
    expect(speedPerMinute(10, 0)).toBe(0);
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

  it("reports Chinese and Korean in characters per minute", () => {
    const counts = { correct: 100, incorrect: 0, extra: 0, missed: 0 };
    const strokes = keystrokes(Array(100).fill(1) as (0 | 1)[], 600);

    const latin = computeStats(counts, strokes, 60_000, "wpm");
    const cjk = computeStats(counts, strokes, 60_000, "cpm");

    expect(latin.speed).toBe(20);
    expect(cjk.speed).toBe(100);
    expect(cjk.unit).toBe("cpm");
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

    expect(stats.speed).toBe(20);
    expect(stats.rawSpeed).toBe(22);
    expect(stats.unit).toBe("wpm");
    expect(stats.accuracy).toBe(80);
    expect(stats.consistency).toBeGreaterThanOrEqual(0);
  });
});

describe("speedUnitFor", () => {
  it("uses characters per minute for Chinese and Korean", () => {
    expect(speedUnitFor("chinese")).toBe("cpm");
    expect(speedUnitFor("korean")).toBe("cpm");
  });

  it("uses words per minute everywhere else", () => {
    for (const language of ["english", "french", "russian", "typescript", "selection"]) {
      expect(speedUnitFor(language)).toBe("wpm");
    }
  });
});
