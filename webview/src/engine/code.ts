import type { StopOnError } from "../../../shared/settings";
import type { CharCounts, CharState, Step } from "./types";

export interface CodeState {
  /** Normalized snippet: LF line endings, spaces instead of tabs. */
  target: string;
  states: CharState[];
  /** What the user pressed at each position, when it was wrong. */
  typed: string[];
  /** Index of the next character to type. */
  index: number;
  finished: boolean;
}

export interface CodeOptions {
  stopOnError: StopOnError;
}

/**
 * Indentation is auto-advanced rather than typed: it is the part of code typing
 * that an editor does for you anyway, and typing it by hand was the source of
 * the old cursor-drift bugs.
 */
function skipIndentation(states: CharState[], target: string, from: number): number {
  let index = from;
  while (index < target.length && (target[index] === " " || target[index] === "\t")) {
    states[index] = "skipped";
    index += 1;
  }
  return index;
}

export function createCodeState(target: string): CodeState {
  const states: CharState[] = new Array(target.length).fill("pending");
  const index = skipIndentation(states, target, 0);

  return {
    target,
    states,
    typed: new Array(target.length).fill(""),
    index,
    finished: index >= target.length,
  };
}

export function typeChar(state: CodeState, char: string, options: CodeOptions): Step<CodeState> {
  if (state.finished || char.length !== 1) {
    return { state, outcome: "ignored" };
  }

  const expected = state.target[state.index];

  // A newline can only be satisfied by Enter, and Enter only by a newline.
  if (expected === "\n" || char === "\n") {
    if (expected !== char) {
      return { state, outcome: "incorrect" };
    }
    return { state: advance(state, state.index, "correct"), outcome: "correct" };
  }

  if (expected !== char) {
    if (options.stopOnError !== "off") {
      return { state, outcome: "incorrect" };
    }
    return { state: advance(state, state.index, "incorrect", char), outcome: "incorrect" };
  }

  return { state: advance(state, state.index, "correct"), outcome: "correct" };
}

function advance(state: CodeState, at: number, result: CharState, pressed = ""): CodeState {
  const states = state.states.slice();
  states[at] = result;

  const typed = state.typed.slice();
  typed[at] = pressed;

  let index = at + 1;
  if (state.target[at] === "\n") {
    index = skipIndentation(states, state.target, index);
  }

  return { ...state, states, typed, index, finished: index >= state.target.length };
}

export function backspace(state: CodeState, wholeWord: boolean): CodeState {
  if (state.index === 0) {
    return state;
  }

  const states = state.states.slice();
  let index = state.index;

  const stepBack = () => {
    index -= 1;
    while (index > 0 && states[index] === "skipped") {
      states[index] = "pending";
      index -= 1;
    }
    states[index] = "pending";
  };

  stepBack();

  if (wholeWord) {
    // Delete back to the start of the current run of word characters.
    while (index > 0 && /\w/.test(state.target[index - 1]) && states[index - 1] !== "skipped") {
      index -= 1;
      states[index] = "pending";
    }
  }

  return { ...state, states, index, finished: false };
}

/**
 * Tab advances through the current run of indentation, so the key does what a
 * developer expects instead of moving focus out of the panel.
 */
export function tab(state: CodeState): CodeState {
  if (state.finished) {
    return state;
  }

  const states = state.states.slice();
  const index = skipIndentation(states, state.target, state.index);

  if (index === state.index) {
    return state;
  }

  return { ...state, states, index, finished: index >= state.target.length };
}

export function codeCounts(state: CodeState): CharCounts {
  const counts: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0 };

  for (const charState of state.states) {
    if (charState === "correct") counts.correct += 1;
    else if (charState === "incorrect") counts.incorrect += 1;
  }

  return counts;
}

/**
 * Characters the user actually has to type, ignoring indentation.
 *
 * Derived from the target rather than from `states`, so the total stays fixed
 * for the whole run instead of shrinking as indentation gets auto-skipped.
 */
export function typeableLength(state: CodeState): number {
  return state.target.length - indentationLength(state.target);
}

/** Characters typed so far, right or wrong. */
export function typedLength(state: CodeState): number {
  return state.states.reduce(
    (count, charState) => count + (charState === "correct" || charState === "incorrect" ? 1 : 0),
    0,
  );
}

function indentationLength(target: string): number {
  let total = 0;
  let atLineStart = true;

  for (const char of target) {
    if (char === "\n") {
      atLineStart = true;
      continue;
    }
    if (atLineStart && (char === " " || char === "\t")) {
      total += 1;
      continue;
    }
    atLineStart = false;
  }

  return total;
}
