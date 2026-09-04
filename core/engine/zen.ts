import type { CharCounts } from "./types";

/**
 * Free typing: no target text, nothing to get wrong. The engine only records
 * what was typed so the speed figures and the caret have something to work
 * with; the run ends when the user says so.
 */
export interface ZenState {
  typed: string;
  finished: boolean;
}

export function createZenState(): ZenState {
  return { typed: "", finished: false };
}

export function typeChar(state: ZenState, char: string): ZenState {
  if (state.finished || char.length !== 1) {
    return state;
  }
  return { ...state, typed: state.typed + char };
}

export function backspace(state: ZenState, wholeWord: boolean): ZenState {
  if (state.finished || state.typed.length === 0) {
    return state;
  }

  if (!wholeWord) {
    return { ...state, typed: state.typed.slice(0, -1) };
  }

  // Drop trailing whitespace, then the word before it.
  const trimmed = state.typed.replace(/\s+$/, "");
  const cut = trimmed.lastIndexOf(" ") + 1;
  return { ...state, typed: trimmed.slice(0, cut) };
}

export function finish(state: ZenState): ZenState {
  return { ...state, finished: true };
}

export function zenCounts(state: ZenState): CharCounts {
  return { correct: state.typed.length, incorrect: 0, extra: 0, missed: 0 };
}

/** Words typed so far, for the progress readout. */
export function zenWordCount(state: ZenState): number {
  return state.typed.split(/\s+/).filter(Boolean).length;
}
