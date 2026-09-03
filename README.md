# Warm Up — Typing Test

[![Version](https://img.shields.io/visual-studio-marketplace/v/jeusto.warm-up-typing-test.svg)](https://marketplace.visualstudio.com/items?itemName=Jeusto.warm-up-typing-test)
[![Downloads](https://img.shields.io/vscode-marketplace/d/jeusto.warm-up-typing-test.svg)](https://marketplace.visualstudio.com/items?itemName=Jeusto.warm-up-typing-test)
[![Rating](https://img.shields.io/visual-studio-marketplace/stars/jeusto.warm-up-typing-test.svg)](https://marketplace.visualstudio.com/items?itemName=Jeusto.warm-up-typing-test)
[![CI](https://github.com/Jeusto/warm-up-vscode/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeusto/warm-up-vscode/actions/workflows/ci.yml)

🔥 Practice and improve your typing speed without leaving your editor. Plain words,
a race against the clock, or real code — with live WPM, a results breakdown and
personal bests, in a panel that picks up your VS Code theme.

## Install

Search for **Warm Up** in the Extensions view, or grab it from the
[VS Marketplace](https://marketplace.visualstudio.com/items?itemName=Jeusto.warm-up-typing-test).

## Getting started

Open the panel by clicking **Warm Up** in the status bar, pressing
<kbd>ctrl</kbd>+<kbd>alt</kbd>+<kbd>p</kbd> (<kbd>cmd</kbd>+<kbd>alt</kbd>+<kbd>p</kbd> on
macOS), or running **Warm Up: Start typing test** from the command palette.

Then just type. The test starts on your first keystroke.

| Key | Does |
| --- | --- |
| <kbd>esc</kbd> | New test |
| <kbd>shift</kbd>+<kbd>esc</kbd> | Retry the same text |
| <kbd>backspace</kbd> | Fix the current word |
| <kbd>ctrl</kbd>/<kbd>alt</kbd>+<kbd>backspace</kbd> | Delete the whole word |
| <kbd>enter</kbd> | New line, in code mode |
| <kbd>tab</kbd> | Skip indentation, in code mode |

The restart key is configurable — set `warmUp.quickRestart` to `tab` if you prefer
monkeytype's binding.

## Modes

- **words** — a fixed number of words (10 / 25 / 50 / 100), in one of 14 languages.
- **time** — type as much as you can before the clock runs out (15 / 30 / 60 / 120s).
- **code** — a real snippet in one of 12 programming languages, syntax highlighted.
  Indentation is skipped for you; newlines are typed with <kbd>enter</kbd>.

Turn on **punctuation** and **numbers** to make words mode harder.

### Practice with your own code

Select anything in the editor and press
<kbd>ctrl</kbd>+<kbd>alt</kbd>+<kbd>s</kbd> (<kbd>cmd</kbd>+<kbd>alt</kbd>+<kbd>s</kbd>),
or use **Warm Up: Practice with the selected code** from the context menu.
**Warm Up: Practice with the current file** does the same for the whole file.
These runs are not saved to your history, so they cannot skew your personal bests.

## Results

Every finished test reports **WPM**, **accuracy**, **raw WPM**, **consistency**, a
character breakdown (correct / wrong / extra / missed) and a speed-over-time chart.

- **WPM** counts correct characters only, five characters to a word.
- **Raw** counts every character you typed.
- **Accuracy** is the share of keystrokes that were correct.
- **Consistency** is how even your pace was, second to second.

Results are stored locally in VS Code's global state. Your best run per
configuration shows up in the status bar and under **Warm Up: Show personal bests**;
**Warm Up: Clear results history** wipes them.

## Settings

Everything is reachable from the panel toolbar, from **Warm Up: Change a setting**,
or from the settings editor.

| Setting | Description | Default |
| --- | --- | --- |
| `warmUp.mode` | `words`, `time` or `code` | `words` |
| `warmUp.count` | Words, or seconds on the clock | `25` |
| `warmUp.language` | Natural language for words and time modes | `english` |
| `warmUp.programmingLanguage` | Language used for code snippets | `javascript` |
| `warmUp.punctuation` | Sprinkle punctuation into the words | `false` |
| `warmUp.numbers` | Sprinkle numbers into the words | `false` |
| `warmUp.stopOnError` | `off`, `letter` or `word` — block until a mistake is fixed | `off` |
| `warmUp.sound` | Keypress sound: `off`, `click`, `typewriter`, `beep` | `off` |
| `warmUp.errorSound` | Distinct sound on a mistake | `true` |
| `warmUp.volume` | Sound volume, 0 to 1 | `0.4` |
| `warmUp.caretStyle` | `line`, `block`, `underline` or `off` | `line` |
| `warmUp.smoothCaret` | Animate the caret between characters | `true` |
| `warmUp.liveStats` | Show WPM and accuracy while typing | `true` |
| `warmUp.fontSize` | Size of the text you type, in pixels | `26` |
| `warmUp.colorBlindMode` | Move errors off red | `false` |
| `warmUp.quickRestart` | `esc`, `tab` or `off` | `esc` |

Settings from version 1 are migrated automatically the first time you run 2.0.

## Accessibility

- Mistakes are marked by shape (underline, strike-through) as well as colour, and
  `warmUp.colorBlindMode` moves errors off red entirely.
- The character you actually pressed is shown above the one you missed.
- The caret can be disabled, and animations respect `prefers-reduced-motion`.
- Everything is driven from a real focused input, so dead keys (the French
  <kbd>`</kbd>), AltGr combinations and IME composition all work.

## Contributing

Word lists and code snippets are plain JSON files — adding a language is a small
pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the layout and the dev
workflow, including a browser preview that runs the panel without an extension host.

## Credits

- [monkeytype](https://monkeytype.com) for setting the bar on what a typing test
  should feel like.
- [Typings](https://github.com/briano1905/typings), the original project this
  extension grew out of.
- Flaticon, for the SVGs used to build the extension icon.

## License

[GPL-3.0-or-later](LICENSE)
