import type { StopOnError } from "../../../shared/settings";
import type { CharCounts, CharState, Step } from "./types";

/** Overflow characters kept per word before further input is dropped. */
const MAX_EXTRA = 12;

export interface WordsState {
  words: string[];
  /** What the user entered for each word; `typed[active]` is in progress. */
  typed: string[];
  active: number;
  finished: boolean;
}

export interface WordsOptions {
  stopOnError: StopOnError;
}

export function createWordsState(words: string[]): WordsState {
  return { words, typed: [""], active: 0, finished: words.length === 0 };
}

/** True when what the user typed so far is still a valid prefix of the word. */
function isClean(state: WordsState, index = state.active): boolean {
  const word = state.words[index] ?? "";
  const typed = state.typed[index] ?? "";
  return word.startsWith(typed);
}

function isPerfect(state: WordsState, index: number): boolean {
  return state.words[index] === state.typed[index];
}

export function typeChar(state: WordsState, char: string, options: WordsOptions): Step<WordsState> {
  if (state.finished || char.length !== 1) {
    return { state, outcome: "ignored" };
  }

  if (char === " ") {
    return commitWord(state, options);
  }

  const word = state.words[state.active] ?? "";
  const typed = state.typed[state.active] ?? "";
  const correct = word[typed.length] === char;

  // stop-on-error: the first mistake is shown, everything after it is refused
  // until the user backspaces over it.
  if (options.stopOnError !== "off" && !isClean(state)) {
    return { state, outcome: "incorrect" };
  }

  if (typed.length >= word.length + MAX_EXTRA) {
    return { state, outcome: "incorrect" };
  }

  const next = replace(state.typed, state.active, typed + char);
  const advanced: WordsState = { ...state, typed: next };

  // Finishing the very last word exactly ends the test without a trailing space.
  if (state.active === state.words.length - 1 && next[state.active] === word) {
    return { state: { ...advanced, finished: true }, outcome: "correct" };
  }

  return { state: advanced, outcome: correct ? "correct" : "incorrect" };
}

function commitWord(state: WordsState, options: WordsOptions): Step<WordsState> {
  const typed = state.typed[state.active] ?? "";

  // Leading / repeated spaces do nothing.
  if (typed.length === 0) {
    return { state, outcome: "ignored" };
  }

  if (options.stopOnError === "word" && !isPerfect(state, state.active)) {
    return { state, outcome: "incorrect" };
  }
  if (options.stopOnError === "letter" && !isClean(state)) {
    return { state, outcome: "incorrect" };
  }

  const active = state.active + 1;
  const correct = isPerfect(state, state.active);

  if (active >= state.words.length) {
    return {
      state: { ...state, active: state.words.length, finished: true },
      outcome: correct ? "correct" : "incorrect",
    };
  }

  return {
    state: { ...state, active, typed: replace(state.typed, active, state.typed[active] ?? "") },
    outcome: correct ? "correct" : "incorrect",
  };
}

export function backspace(state: WordsState, wholeWord: boolean): WordsState {
  if (state.finished) {
    return state;
  }

  const typed = state.typed[state.active] ?? "";

  if (typed.length === 0) {
    // Step back into the previous word, but only if it still needs fixing.
    const previous = state.active - 1;
    if (previous < 0 || isPerfect(state, previous)) {
      return state;
    }
    return { ...state, active: previous };
  }

  return {
    ...state,
    typed: replace(state.typed, state.active, wholeWord ? "" : typed.slice(0, -1)),
  };
}

/** Extends the word pool in time mode, where the test has no fixed length. */
export function appendWords(state: WordsState, words: string[]): WordsState {
  return { ...state, words: [...state.words, ...words] };
}

/** Per-character render states for one word. */
export function wordChars(state: WordsState, index: number): TypedChar[] {
  return charsFor(state.words[index] ?? "", state.typed[index] ?? "", index < state.active);
}

export interface TypedChar {
  char: string;
  state: CharState;
  /** What the user actually pressed, when it was not this character. */
  typed?: string;
}

/**
 * Pure view of one word, so the renderer can memoise on primitives instead of
 * re-deriving every word from the whole state on each keystroke.
 */
export function charsFor(word: string, typed: string, committed: boolean): TypedChar[] {
  const chars: TypedChar[] = [];

  for (let i = 0; i < word.length; i += 1) {
    if (i < typed.length) {
      const correct = typed[i] === word[i];
      chars.push({
        char: word[i],
        state: correct ? "correct" : "incorrect",
        typed: correct ? undefined : typed[i],
      });
    } else {
      chars.push({ char: word[i], state: committed ? "missed" : "pending" });
    }
  }

  for (let i = word.length; i < typed.length; i += 1) {
    chars.push({ char: typed[i], state: "extra" });
  }

  return chars;
}

export function wordsCounts(state: WordsState): CharCounts {
  const counts: CharCounts = { correct: 0, incorrect: 0, extra: 0, missed: 0 };
  const last = Math.min(state.active, state.words.length - 1);

  for (let index = 0; index <= last; index += 1) {
    for (const { state: charState } of wordChars(state, index)) {
      if (charState === "correct") counts.correct += 1;
      else if (charState === "incorrect") counts.incorrect += 1;
      else if (charState === "extra") counts.extra += 1;
      else if (charState === "missed") counts.missed += 1;
    }

    // The space that follows a perfectly typed word counts as a correct char,
    // which is what makes WPM comparable with other typing tests.
    if (index < state.active && index < state.words.length - 1 && isPerfect(state, index)) {
      counts.correct += 1;
    }
  }

  return counts;
}

/** Words fully committed so far, for the "23/50" progress readout. */
export function wordsCompleted(state: WordsState): number {
  return Math.min(state.active, state.words.length);
}

function replace(list: string[], index: number, value: string): string[] {
  const next = list.slice();
  while (next.length <= index) {
    next.push("");
  }
  next[index] = value;
  return next;
}
