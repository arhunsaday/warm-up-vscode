import type { NaturalLanguage, ProgrammingLanguage } from "@shared/settings";
import type { Quote } from "../engine/quotes";

import englishQuotes from "./quotes/english.json";

import chinese from "./words/chinese.json";
import english from "./words/english.json";
import englishTop1000 from "./words/englishTop1000.json";
import finnish from "./words/finnish.json";
import french from "./words/french.json";
import german from "./words/german.json";
import italian from "./words/italian.json";
import korean from "./words/korean.json";
import polish from "./words/polish.json";
import portuguese from "./words/portuguese.json";
import russian from "./words/russian.json";
import spanish from "./words/spanish.json";
import swedish from "./words/swedish.json";
import turkish from "./words/turkish.json";

import c from "./snippets/c.json";
import cpp from "./snippets/cpp.json";
import csharp from "./snippets/csharp.json";
import go from "./snippets/go.json";
import java from "./snippets/java.json";
import javascript from "./snippets/javascript.json";
import kotlin from "./snippets/kotlin.json";
import php from "./snippets/php.json";
import python from "./snippets/python.json";
import ruby from "./snippets/ruby.json";
import rust from "./snippets/rust.json";
import typescript from "./snippets/typescript.json";

export const WORDS: Record<NaturalLanguage, string[]> = {
  english,
  englishTop1000,
  chinese,
  finnish,
  french,
  german,
  italian,
  korean,
  polish,
  portuguese,
  russian,
  spanish,
  swedish,
  turkish,
};

export const SNIPPETS: Record<ProgrammingLanguage, string[]> = {
  javascript,
  typescript,
  python,
  java,
  csharp,
  cpp,
  c,
  go,
  kotlin,
  php,
  ruby,
  rust,
};

/**
 * Quotes are per language, but only English has a curated public-domain set so
 * far; everything else falls back to it rather than showing an empty mode.
 */
export const QUOTES: Record<string, Quote[]> = {
  english: englishQuotes,
  englishTop1000: englishQuotes,
};

export function quotesFor(language: string): Quote[] {
  return QUOTES[language] ?? QUOTES.english;
}

/** Display names for the language pickers. */
export const LANGUAGE_LABELS: Record<string, string> = {
  english: "english",
  englishTop1000: "english 1k",
  chinese: "中文",
  finnish: "suomi",
  french: "français",
  german: "deutsch",
  italian: "italiano",
  korean: "한국어",
  polish: "polski",
  portuguese: "português",
  russian: "русский",
  spanish: "español",
  swedish: "svenska",
  turkish: "türkçe",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  cpp: "C++",
  c: "C",
  go: "Go",
  kotlin: "Kotlin",
  php: "PHP",
  ruby: "Ruby",
  rust: "Rust",
};

export function languageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}
