import { describe, expect, it } from "vitest";
import {
  type WordsOptions,
  type WordsState,
  backspace,
  createWordsState,
  typeChar,
  wordChars,
  wordsCounts,
} from "./words";

const OFF: WordsOptions = { stopOnError: "off" };

function type(state: WordsState, text: string, options: WordsOptions = OFF) {
  const outcomes: string[] = [];
  let current = state;
  for (const char of text) {
    const step = typeChar(current, char, options);
    current = step.state;
    outcomes.push(step.outcome);
  }
  return { state: current, outcomes };
}

describe("words engine", () => {
  it("marks a perfectly typed word as correct and advances", () => {
    const { state, outcomes } = type(createWordsState(["one", "two"]), "one ");

    expect(outcomes).toEqual(["correct", "correct", "correct", "correct"]);
    expect(state.active).toBe(1);
    expect(wordChars(state, 0).map((entry) => entry.state)).toEqual([
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("records mistyped characters without blocking by default", () => {
    const { state, outcomes } = type(createWordsState(["one", "two"]), "onx");

    expect(outcomes).toEqual(["correct", "correct", "incorrect"]);
    expect(wordChars(state, 0)[2].state).toBe("incorrect");
  });

  it("keeps overflow characters as extras", () => {
    const { state } = type(createWordsState(["one", "two"]), "oneee");
    const chars = wordChars(state, 0);

    expect(chars).toHaveLength(5);
    expect(chars.slice(3).map((entry) => entry.state)).toEqual(["extra", "extra"]);
  });

  it("marks untyped characters of a skipped word as missed", () => {
    const { state } = type(createWordsState(["hello", "two"]), "he ");

    expect(state.active).toBe(1);
    expect(wordChars(state, 0).map((entry) => entry.state)).toEqual([
      "correct",
      "correct",
      "missed",
      "missed",
      "missed",
    ]);
  });

  it("ignores spaces before any input", () => {
    const step = typeChar(createWordsState(["one"]), " ", OFF);

    expect(step.outcome).toBe("ignored");
    expect(step.state.active).toBe(0);
  });

  it("finishes on the last character of the last word", () => {
    const { state } = type(createWordsState(["one", "two"]), "one two");

    expect(state.finished).toBe(true);
  });

  it("finishes when the last word is committed with a space", () => {
    const { state } = type(createWordsState(["one", "two"]), "one twx ");

    expect(state.finished).toBe(true);
  });

  describe("stop on error", () => {
    it("refuses further letters after a mistake in letter mode", () => {
      const options: WordsOptions = { stopOnError: "letter" };
      const { state, outcomes } = type(createWordsState(["one", "two"]), "oxe", options);

      expect(outcomes).toEqual(["correct", "incorrect", "incorrect"]);
      expect(state.typed[0]).toBe("ox");
    });

    it("refuses the space until the word is right in word mode", () => {
      const options: WordsOptions = { stopOnError: "word" };
      const { state } = type(createWordsState(["one", "two"]), "onx ", options);

      expect(state.active).toBe(0);
    });
  });

  describe("backspace", () => {
    it("removes the last character", () => {
      const { state } = type(createWordsState(["one"]), "on");

      expect(backspace(state, false).typed[0]).toBe("o");
    });

    it("clears the word when deleting a whole word", () => {
      const { state } = type(createWordsState(["one"]), "on");

      expect(backspace(state, true).typed[0]).toBe("");
    });

    it("steps back into a previous word that was wrong", () => {
      const { state } = type(createWordsState(["one", "two"]), "onx ");

      expect(backspace(state, false).active).toBe(0);
    });

    it("does not step back into a word that was perfect", () => {
      const { state } = type(createWordsState(["one", "two"]), "one ");

      expect(backspace(state, false).active).toBe(1);
    });
  });

  describe("character counts", () => {
    it("counts the space after a correct word", () => {
      const { state } = type(createWordsState(["ab", "cd"]), "ab ");

      expect(wordsCounts(state)).toEqual({ correct: 3, incorrect: 0, extra: 0, missed: 0 });
    });

    it("does not count the space after a wrong word", () => {
      const { state } = type(createWordsState(["ab", "cd"]), "ax ");

      expect(wordsCounts(state)).toEqual({ correct: 1, incorrect: 1, extra: 0, missed: 0 });
    });

    it("counts extras and missed characters", () => {
      const { state } = type(createWordsState(["abcd", "ef"]), "abx ");

      expect(wordsCounts(state)).toEqual({ correct: 2, incorrect: 1, extra: 0, missed: 1 });
    });
  });
});
