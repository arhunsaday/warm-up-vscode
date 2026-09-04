import { DEFAULT_SETTINGS } from "@shared/settings";
import { describe, expect, it } from "vitest";
import { createSession, needsMoreWords, sessionCounts, topUpWords } from "./session";

const config = {
  mode: DEFAULT_SETTINGS.mode,
  count: 10,
  language: "english",
  programmingLanguage: "typescript",
  punctuation: false,
  numbers: false,
  quoteLength: DEFAULT_SETTINGS.quoteLength,
};

describe("createSession", () => {
  it("builds a words run of the requested length", () => {
    const session = createSession(config);

    expect(session.kind).toBe("words");
    expect(session.words?.words).toHaveLength(10);
    expect(session.label).toBe("english");
  });

  it("builds a quote run with its attribution", () => {
    const session = createSession({ ...config, mode: "quotes" });

    expect(session.kind).toBe("words");
    expect(session.quote?.source.length).toBeGreaterThan(0);
    expect(session.words?.words.length).toBeGreaterThan(0);
  });

  it("builds a code run with one token class per character", () => {
    const session = createSession({ ...config, mode: "code" });

    expect(session.kind).toBe("code");
    expect(session.codeClasses).toHaveLength(session.code?.target.length ?? -1);
    expect(session.label).toBe("typescript");
  });

  it("builds an empty zen run", () => {
    const session = createSession({ ...config, mode: "zen" });

    expect(session.kind).toBe("zen");
    expect(session.zen?.typed).toBe("");
  });

  it("treats custom text as code, whatever the mode says", () => {
    const session = createSession(config, {
      custom: { text: "const a = 1;", languageId: "typescript", origin: "selection" },
    });

    expect(session.kind).toBe("code");
    expect(session.code?.target).toBe("const a = 1;");
    expect(session.label).toBe("selection");
  });

  it("reuses the previous text when asked", () => {
    const first = createSession(config);
    const again = createSession(config, { reuse: first });

    expect(again.words?.words).toEqual(first.words?.words);
  });

  it("takes a fixed word list", () => {
    const session = createSession(config, { fixedWords: ["one", "two"] });

    expect(session.words?.words).toEqual(["one", "two"]);
  });

  it("generates a buffer rather than `count` words in time mode", () => {
    const session = createSession({ ...config, mode: "time", count: 5 });

    expect(session.words?.words.length).toBeGreaterThan(5);
  });
});

describe("time mode top-up", () => {
  it("asks for more words as the caret approaches the end", () => {
    const session = createSession({ ...config, mode: "time" });
    const words = session.words!;

    expect(needsMoreWords(words)).toBe(false);
    expect(needsMoreWords({ ...words, active: words.words.length - 5 })).toBe(true);
  });

  it("extends the list and clears the finished flag", () => {
    const session = createSession({ ...config, mode: "time" });
    const words = { ...session.words!, finished: true };
    const extended = topUpWords(words, { ...config, mode: "time" });

    expect(extended.words.length).toBeGreaterThan(words.words.length);
    expect(extended.finished).toBe(false);
  });
});

describe("sessionCounts", () => {
  it("reports zero for a fresh run", () => {
    expect(sessionCounts(createSession(config))).toEqual({
      correct: 0,
      incorrect: 0,
      extra: 0,
      missed: 0,
    });
  });

  it("counts zen characters as correct", () => {
    const session = createSession({ ...config, mode: "zen" });
    session.zen!.typed = "hello";

    expect(sessionCounts(session).correct).toBe(5);
  });
});
