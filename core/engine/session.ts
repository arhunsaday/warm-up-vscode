import type { QuoteLength, TypingMode } from "@shared/settings";
import { SNIPPETS, WORDS, quotesFor } from "../data";
import { tokenizeToChars } from "../highlight";
import { type CodeState, codeCounts, createCodeState } from "./code";
import { generateWords, normalizeCode, pickSnippet } from "./generator";
import { type Quote, pickQuote, quoteWords } from "./quotes";
import type { CharCounts } from "./types";
import { type WordsState, appendWords, createWordsState, wordsCounts } from "./words";
import { type ZenState, createZenState, zenCounts } from "./zen";

/** Words kept ahead of the caret in time mode, where the test has no end. */
export const TIME_BUFFER = 60;

export interface SessionConfig {
  mode: TypingMode;
  count: number;
  language: string;
  programmingLanguage: string;
  punctuation: boolean;
  numbers: boolean;
  quoteLength: QuoteLength;
}

/** Text supplied by the caller instead of generated — a selection, or a file. */
export interface CustomSource {
  text: string;
  languageId: string;
  origin: string;
}

export interface Session {
  kind: "words" | "code" | "zen";
  words: WordsState | null;
  code: CodeState | null;
  zen: ZenState | null;
  /** Prism token class per character, aligned with `code.target`. */
  codeClasses: string[];
  /** Language name, or where a custom snippet came from. Also the stats key. */
  label: string;
  /** Present in quotes mode, for the attribution on the results screen. */
  quote?: Quote;
}

export interface SessionOptions {
  custom?: CustomSource | null;
  /** Reuse the previous text instead of generating new text. */
  reuse?: Session | null;
  /** Fixed word list, used by the website's headline test. */
  fixedWords?: string[];
}

const EMPTY = { words: null, code: null, zen: null, codeClasses: [] as string[] };

/**
 * Builds a run from a configuration. Pure apart from the random choices, and
 * shared by every front-end so they cannot drift apart.
 */
export function createSession(config: SessionConfig, options: SessionOptions = {}): Session {
  const { custom, reuse, fixedWords } = options;

  if (fixedWords) {
    return { ...EMPTY, kind: "words", words: createWordsState(fixedWords), label: "fixed" };
  }

  if (config.mode === "zen") {
    return { ...EMPTY, kind: "zen", zen: createZenState(), label: "zen" };
  }

  if (config.mode === "code" || custom) {
    const languageId = custom?.languageId ?? config.programmingLanguage;
    const target =
      reuse?.code?.target ??
      (custom
        ? normalizeCode(custom.text)
        : pickSnippet(SNIPPETS[config.programmingLanguage as keyof typeof SNIPPETS] ?? []));

    return {
      ...EMPTY,
      kind: "code",
      code: createCodeState(target),
      codeClasses: tokenizeToChars(target, languageId),
      label: custom ? custom.origin : config.programmingLanguage,
    };
  }

  if (config.mode === "quotes") {
    const quote = reuse?.quote ?? pickQuote(quotesFor(config.language), config.quoteLength);
    return {
      ...EMPTY,
      kind: "words",
      words: createWordsState(quote ? quoteWords(quote) : []),
      label: config.language,
      quote,
    };
  }

  const pool = WORDS[config.language as keyof typeof WORDS] ?? WORDS.english;
  const words =
    reuse?.words?.words ??
    generateWords(pool, config.mode === "time" ? TIME_BUFFER : config.count, {
      punctuation: config.punctuation,
      numbers: config.numbers,
    });

  return { ...EMPTY, kind: "words", words: createWordsState(words), label: config.language };
}

/** True when a time-mode run is close enough to the end to need more words. */
export function needsMoreWords(words: WordsState): boolean {
  return words.words.length - words.active < TIME_BUFFER / 2;
}

/** Extends a time-mode run so it never runs out mid-sprint. */
export function topUpWords(words: WordsState, config: SessionConfig): WordsState {
  const pool = WORDS[config.language as keyof typeof WORDS] ?? WORDS.english;
  const extended = appendWords(
    words,
    generateWords(pool, TIME_BUFFER, {
      punctuation: config.punctuation,
      numbers: config.numbers,
    }),
  );
  return { ...extended, finished: false };
}

export function sessionCounts(session: Session): CharCounts {
  if (session.kind === "zen" && session.zen) {
    return zenCounts(session.zen);
  }
  if (session.kind === "code" && session.code) {
    return codeCounts(session.code);
  }
  if (session.words) {
    return wordsCounts(session.words);
  }
  return { correct: 0, incorrect: 0, extra: 0, missed: 0 };
}

export type { CodeState, WordsState, ZenState };
