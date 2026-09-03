import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-php";
import "prismjs/components/prism-python";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-rust";

// The webview renders its own character spans, so Prism must never touch the DOM.
Prism.manual = true;

/** Maps VS Code language ids onto the Prism grammars we ship. */
const VSCODE_TO_PRISM: Record<string, string> = {
  javascriptreact: "javascript",
  typescriptreact: "typescript",
  "objective-c": "c",
  "objective-cpp": "cpp",
  vue: "markup",
  html: "markup",
  xml: "markup",
  svelte: "markup",
  shellscript: "clike",
  json: "javascript",
  jsonc: "javascript",
  scss: "css",
  less: "css",
};

export function prismLanguage(languageId: string): string {
  const mapped = VSCODE_TO_PRISM[languageId] ?? languageId;
  return mapped in Prism.languages ? mapped : "clike";
}

/**
 * Turns a snippet into one entry per character, carrying the Prism token class.
 * Working at character granularity is what lets the code view colour syntax and
 * typing progress at the same time, without parsing HTML back out of Prism.
 */
export function tokenizeToChars(code: string, languageId: string): string[] {
  const language = prismLanguage(languageId);
  const grammar = Prism.languages[language];
  const classes: string[] = new Array(code.length).fill("");

  if (!grammar) {
    return classes;
  }

  let cursor = 0;
  const walk = (tokens: (string | Prism.Token)[], inherited: string) => {
    for (const token of tokens) {
      if (typeof token === "string") {
        for (let i = 0; i < token.length; i += 1) {
          classes[cursor + i] = inherited;
        }
        cursor += token.length;
        continue;
      }

      const own = [token.type, ...toArray(token.alias)].filter(Boolean).join(" ");
      const combined = inherited ? `${inherited} ${own}` : own;

      if (typeof token.content === "string") {
        for (let i = 0; i < token.content.length; i += 1) {
          classes[cursor + i] = combined;
        }
        cursor += token.content.length;
      } else {
        walk(toArray(token.content) as (string | Prism.Token)[], combined);
      }
    }
  };

  walk(Prism.tokenize(code, grammar), "");

  return classes;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
