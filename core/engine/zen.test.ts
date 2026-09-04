import { describe, expect, it } from "vitest";
import { backspace, createZenState, finish, typeChar, zenCounts, zenWordCount } from "./zen";

function type(text: string) {
  let state = createZenState();
  for (const char of text) {
    state = typeChar(state, char);
  }
  return state;
}

describe("zen engine", () => {
  it("records everything as typed", () => {
    const state = type("hello world");

    expect(state.typed).toBe("hello world");
    expect(zenCounts(state)).toEqual({ correct: 11, incorrect: 0, extra: 0, missed: 0 });
  });

  it("counts words", () => {
    expect(zenWordCount(type("one two  three "))).toBe(3);
    expect(zenWordCount(createZenState())).toBe(0);
  });

  it("deletes a character", () => {
    expect(backspace(type("abc"), false).typed).toBe("ab");
  });

  it("deletes a whole word, including the space after it", () => {
    expect(backspace(type("one two "), true).typed).toBe("one ");
    expect(backspace(type("one two"), true).typed).toBe("one ");
  });

  it("does nothing at the start", () => {
    const state = createZenState();
    expect(backspace(state, false)).toBe(state);
  });

  it("ignores input once finished", () => {
    const done = finish(type("hi"));
    expect(typeChar(done, "x")).toBe(done);
    expect(done.finished).toBe(true);
  });
});
