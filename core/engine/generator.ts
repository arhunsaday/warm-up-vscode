/** Random source, injectable so the generators can be unit tested. */
export type Rng = () => number;

export interface GenerateOptions {
  punctuation: boolean;
  numbers: boolean;
  rng?: Rng;
}

const SENTENCE_ENDINGS = [".", ".", ".", "?", "!"];
const MID_SENTENCE = [",", ",", ";", ":"];

/**
 * Builds the word list for a run. Punctuation and numbers follow the same
 * approach as monkeytype: a small chance per word, so the text stays readable.
 */
export function generateWords(pool: string[], count: number, options: GenerateOptions): string[] {
  const rng = options.rng ?? Math.random;
  if (pool.length === 0 || count <= 0) {
    return [];
  }

  const words: string[] = [];
  while (words.length < count) {
    const word = pool[Math.floor(rng() * pool.length)];
    // Avoid typing the same word twice in a row; with tiny pools, give up.
    if (words.length > 0 && words[words.length - 1] === word && pool.length > 1) {
      continue;
    }
    words.push(word);
  }

  if (options.numbers) {
    addNumbers(words, rng);
  }
  if (options.punctuation) {
    addPunctuation(words, rng);
  }

  return words;
}

function addNumbers(words: string[], rng: Rng): void {
  for (let i = 0; i < words.length; i += 1) {
    if (rng() < 0.1) {
      words[i] = String(Math.floor(rng() * 10_000));
    }
  }
}

function addPunctuation(words: string[], rng: Rng): void {
  let startOfSentence = true;

  for (let i = 0; i < words.length; i += 1) {
    if (startOfSentence) {
      words[i] = capitalize(words[i]);
      startOfSentence = false;
    }

    const roll = rng();
    const isLast = i === words.length - 1;

    if (isLast) {
      words[i] += SENTENCE_ENDINGS[0];
      continue;
    }

    if (roll < 0.06) {
      words[i] += pick(SENTENCE_ENDINGS, rng);
      startOfSentence = true;
    } else if (roll < 0.14) {
      words[i] += pick(MID_SENTENCE, rng);
    } else if (roll < 0.17) {
      words[i] = `"${words[i]}"`;
    } else if (roll < 0.19) {
      words[i] = `(${words[i]})`;
    }
  }
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function pick<T>(values: readonly T[], rng: Rng): T {
  return values[Math.floor(rng() * values.length)];
}

/**
 * Makes an arbitrary snippet typeable: LF line endings, spaces instead of tabs,
 * no trailing whitespace, no shared leading indentation, no long blank runs.
 */
export function normalizeCode(source: string, tabSize = 2): string {
  const lines = source
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ".repeat(tabSize))
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""));

  while (lines.length > 0 && lines[0] === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const indents = lines
    .filter((line) => line.length > 0)
    .map((line) => line.length - line.trimStart().length);
  const common = indents.length > 0 ? Math.min(...indents) : 0;

  const dedented = lines.map((line) => line.slice(common));

  // Collapse runs of blank lines: typing three empty lines in a row is busywork.
  return dedented.filter((line, index) => line !== "" || dedented[index - 1] !== "").join("\n");
}

export function pickSnippet(snippets: string[], rng: Rng = Math.random): string {
  if (snippets.length === 0) {
    return "";
  }
  return normalizeCode(snippets[Math.floor(rng() * snippets.length)]);
}
