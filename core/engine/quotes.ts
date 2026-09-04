import type { QuoteLength } from "@shared/settings";
import type { Rng } from "./generator";

export interface Quote {
  text: string;
  /** Attribution, shown on the results screen. */
  source: string;
}

/**
 * Length buckets, by character count. Chosen so each bucket holds a usable
 * number of quotes rather than on any external convention.
 */
const SHORT_MAX = 120;
const MEDIUM_MAX = 320;

export function quoteLength(quote: Quote): Exclude<QuoteLength, "any"> {
  if (quote.text.length < SHORT_MAX) {
    return "short";
  }
  return quote.text.length < MEDIUM_MAX ? "medium" : "long";
}

export function quotesOfLength(quotes: Quote[], length: QuoteLength): Quote[] {
  if (length === "any") {
    return quotes;
  }
  const matching = quotes.filter((quote) => quoteLength(quote) === length);
  // Never leave the user with nothing to type because a bucket is empty.
  return matching.length > 0 ? matching : quotes;
}

export function pickQuote(
  quotes: Quote[],
  length: QuoteLength,
  rng: Rng = Math.random,
): Quote | undefined {
  const pool = quotesOfLength(quotes, length);
  if (pool.length === 0) {
    return undefined;
  }
  return pool[Math.floor(rng() * pool.length)];
}

/** Splits a quote into the words the engine types, preserving punctuation. */
export function quoteWords(quote: Quote): string[] {
  return quote.text.split(/\s+/).filter(Boolean);
}
