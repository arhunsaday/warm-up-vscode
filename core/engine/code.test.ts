import { describe, expect, it } from "vitest";
import {
  type CodeOptions,
  type CodeState,
  backspace,
  codeCounts,
  createCodeState,
  tab,
  typeChar,
  typeableLength,
  typedLength,
} from "./code";

const OFF: CodeOptions = { stopOnError: "off" };

function type(state: CodeState, text: string, options: CodeOptions = OFF) {
  const outcomes: string[] = [];
  let current = state;
  for (const char of text) {
    const step = typeChar(current, char, options);
    current = step.state;
    outcomes.push(step.outcome);
  }
  return { state: current, outcomes };
}

describe("code engine", () => {
  it("auto-skips the indentation of the next line after Enter", () => {
    const state = createCodeState("if (x) {\n  go();\n}");
    const { state: afterLine } = type(state, "if (x) {\n");

    // The caret lands on `g`, not on the two leading spaces.
    expect(afterLine.target[afterLine.index]).toBe("g");
    expect(afterLine.states.slice(9, 11)).toEqual(["skipped", "skipped"]);
  });

  it("skips leading indentation of the very first line", () => {
    const state = createCodeState("    hi");

    expect(state.index).toBe(4);
    expect(typeableLength(state)).toBe(2);
  });

  it("requires Enter for a newline and refuses other keys", () => {
    const state = createCodeState("a\nb");
    const { state: afterA } = type(state, "a");
    const wrong = typeChar(afterA, "x", OFF);

    expect(wrong.outcome).toBe("incorrect");
    expect(wrong.state.index).toBe(afterA.index);
  });

  it("refuses Enter in the middle of a line", () => {
    const state = createCodeState("ab");
    const step = typeChar(state, "\n", OFF);

    expect(step.outcome).toBe("incorrect");
    expect(step.state.index).toBe(0);
  });

  it("advances past mistakes when stop on error is off", () => {
    const { state, outcomes } = type(createCodeState("abc"), "axc");

    expect(outcomes).toEqual(["correct", "incorrect", "correct"]);
    expect(state.finished).toBe(true);
    expect(codeCounts(state)).toEqual({ correct: 2, incorrect: 1, extra: 0, missed: 0 });
  });

  it("blocks on a mistake when stop on error is on", () => {
    const options: CodeOptions = { stopOnError: "letter" };
    const { state } = type(createCodeState("abc"), "ax", options);

    expect(state.index).toBe(1);
  });

  it("does not count skipped indentation in the statistics", () => {
    const state = createCodeState("  ab");
    const { state: done } = type(state, "ab");

    expect(done.finished).toBe(true);
    expect(codeCounts(done)).toEqual({ correct: 2, incorrect: 0, extra: 0, missed: 0 });
  });

  it("steps backspace over auto-skipped indentation", () => {
    const state = createCodeState("a\n  b");
    const { state: afterEnter } = type(state, "a\n");
    const back = backspace(afterEnter, false);

    expect(back.index).toBe(1);
    expect(back.states.slice(2)).toEqual(["pending", "pending", "pending"]);
  });

  it("advances through indentation on Tab", () => {
    const state = createCodeState("a\n");
    const { state: afterEnter } = type(createCodeState("a\n    b"), "a\n");

    // Indentation is already skipped, so Tab is a no-op there.
    expect(tab(afterEnter)).toBe(afterEnter);
    expect(state.index).toBe(0);
  });
});

describe("code progress", () => {
  it("keeps the typeable total fixed while indentation is skipped", () => {
    const state = createCodeState("a\n  b\n  c");
    const total = typeableLength(state);

    let current = state;
    for (const char of "a\nb\nc") {
      current = typeChar(current, char, OFF).state;
    }

    expect(total).toBe(5);
    expect(typeableLength(current)).toBe(total);
    expect(typedLength(current)).toBe(5);
  });
});
