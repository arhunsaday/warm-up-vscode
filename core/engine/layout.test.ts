import { describe, expect, it } from "vitest";
import { lineIndexAt, trackOffset } from "./layout";

// A 26px font at line-height 1.6 gives 41.6px lines; the character box is about
// 30px tall, so it starts ~5.8px below the top of its line box.
const LINE = 41.6;
const CHAR = 30;
const HALF_LEADING = (LINE - CHAR) / 2;
const caretTopOnLine = (line: number) => line * LINE + HALF_LEADING;

describe("lineIndexAt", () => {
  it("assigns a character to its own line despite the half-leading", () => {
    for (let line = 0; line < 6; line += 1) {
      expect(lineIndexAt(caretTopOnLine(line), CHAR, LINE)).toBe(line);
    }
  });

  it("survives a zero line height", () => {
    expect(lineIndexAt(10, 10, 0)).toBe(0);
  });
});

describe("trackOffset", () => {
  it("does not move for the first two lines", () => {
    expect(trackOffset(caretTopOnLine(0), CHAR, LINE)).toBe(0);
    expect(trackOffset(caretTopOnLine(1), CHAR, LINE)).toBe(0);
  });

  it("moves by exactly one line height per line after that", () => {
    expect(trackOffset(caretTopOnLine(2), CHAR, LINE)).toBeCloseTo(LINE);
    expect(trackOffset(caretTopOnLine(3), CHAR, LINE)).toBeCloseTo(2 * LINE);
  });

  it("only ever produces whole multiples of the line height", () => {
    for (let line = 0; line < 40; line += 1) {
      const offset = trackOffset(caretTopOnLine(line), CHAR, LINE);
      expect(Number.isInteger(Math.round((offset / LINE) * 1e6) / 1e6)).toBe(true);
    }
  });
});
