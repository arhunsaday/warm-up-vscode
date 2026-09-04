import { describe, expect, it } from "vitest";
import { generateWords, normalizeCode, pickSnippet } from "./generator";

/** Deterministic, cycling pseudo-random source. */
function seeded(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("generateWords", () => {
  it("produces the requested number of words", () => {
    const words = generateWords(["a", "b", "c"], 10, { punctuation: false, numbers: false });

    expect(words).toHaveLength(10);
  });

  it("never repeats the same word twice in a row", () => {
    const words = generateWords(["a", "b", "c", "d"], 200, {
      punctuation: false,
      numbers: false,
    });

    for (let i = 1; i < words.length; i += 1) {
      expect(words[i]).not.toBe(words[i - 1]);
    }
  });

  it("copes with a single-word pool instead of looping forever", () => {
    const words = generateWords(["a"], 3, { punctuation: false, numbers: false });

    expect(words).toEqual(["a", "a", "a"]);
  });

  it("returns nothing for an empty pool", () => {
    expect(generateWords([], 10, { punctuation: false, numbers: false })).toEqual([]);
  });

  it("capitalises the first word and ends the text when punctuation is on", () => {
    const words = generateWords(["alpha", "beta"], 6, {
      punctuation: true,
      numbers: false,
      rng: seeded([0, 0.9, 0.5, 0.2, 0.8, 0.3]),
    });

    expect(words[0][0]).toBe(words[0][0].toUpperCase());
    expect(words[words.length - 1].endsWith(".")).toBe(true);
  });

  it("inserts numbers when the option is on", () => {
    const words = generateWords(["alpha"], 20, {
      punctuation: false,
      numbers: true,
      rng: seeded([0.5, 0.05, 0.42]),
    });

    expect(words.some((word) => /^\d+$/.test(word))).toBe(true);
  });
});

describe("normalizeCode", () => {
  it("converts tabs, strips trailing whitespace and removes shared indentation", () => {
    const input = "\t  const a = 1;   \n\t  const b = 2;\n";

    expect(normalizeCode(input)).toBe("const a = 1;\nconst b = 2;");
  });

  it("keeps relative indentation", () => {
    expect(normalizeCode("  if (a) {\n    b();\n  }")).toBe("if (a) {\n  b();\n}");
  });

  it("normalises CRLF line endings", () => {
    expect(normalizeCode("a\r\nb")).toBe("a\nb");
  });

  it("collapses runs of blank lines", () => {
    expect(normalizeCode("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims leading and trailing blank lines", () => {
    expect(normalizeCode("\n\na\n\n")).toBe("a");
  });
});

describe("pickSnippet", () => {
  it("returns an empty string when there is nothing to pick", () => {
    expect(pickSnippet([])).toBe("");
  });

  it("normalises whatever it picks", () => {
    expect(pickSnippet(["\tconst a = 1;  "], () => 0)).toBe("const a = 1;");
  });
});
