import { describe, expect, it } from "vitest";
import quotes from "../data/quotes/english.json";
import { type Quote, pickQuote, quoteLength, quoteWords, quotesOfLength } from "./quotes";

const sample: Quote[] = [
  { text: "Short one.", source: "a" },
  { text: `Medium ${"x".repeat(150)}`, source: "b" },
  { text: `Long ${"y".repeat(400)}`, source: "c" },
];

describe("quotes", () => {
  it("buckets quotes by length", () => {
    expect(sample.map(quoteLength)).toEqual(["short", "medium", "long"]);
  });

  it("filters to a bucket", () => {
    expect(quotesOfLength(sample, "long")).toHaveLength(1);
    expect(quotesOfLength(sample, "any")).toHaveLength(3);
  });

  it("falls back to the whole pool when a bucket is empty", () => {
    const onlyShort = [sample[0]];
    expect(quotesOfLength(onlyShort, "long")).toEqual(onlyShort);
  });

  it("returns nothing for an empty pool", () => {
    expect(pickQuote([], "any")).toBeUndefined();
  });

  it("splits a quote into words", () => {
    expect(quoteWords({ text: "  two   words ", source: "" })).toEqual(["two", "words"]);
  });

  it("ships quotes in every length bucket", () => {
    const buckets = new Set((quotes as Quote[]).map(quoteLength));

    expect(buckets).toEqual(new Set(["short", "medium", "long"]));
  });

  it("gives every shipped quote a source", () => {
    for (const quote of quotes as Quote[]) {
      expect(quote.source.length, quote.text).toBeGreaterThan(0);
    }
  });
});
