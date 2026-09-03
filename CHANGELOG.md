# Changelog

All notable changes to this extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0]

A full rewrite. The extension is now a bundled TypeScript host plus a React
webview, with the typing logic isolated in a unit-tested engine.

### Added

- Live WPM and accuracy while typing, and a results screen with raw WPM,
  consistency, a character breakdown and a speed-over-time chart.
- Local results history and personal bests, surfaced in the status bar, in
  **Warm Up: Show personal bests** and in the panel.
- Keypress sounds (`click`, `typewriter`, `beep`) with a distinct error sound,
  synthesised with the Web Audio API — no audio files, no network. (#9)
- `warmUp.stopOnError`: block on a mistake by letter or by word, and see the
  character you actually pressed above the one you missed. (#8)
- **Warm Up: Practice with the current file**, alongside practising with a
  selection. (#1)
- A toolbar inside the panel, so modes, length, language, punctuation, numbers
  and sound no longer need the command palette.
- `numbers`, `caretStyle`, `smoothCaret`, `liveStats`, `fontSize` and
  `quickRestart` settings.
- A context menu entry for practising with the current selection.
- CI on Linux, macOS and Windows, and a release workflow that publishes to the
  VS Marketplace and Open VSX on a `v*` tag.

### Changed

- Words mode now works character by character, like monkeytype: mistakes stay
  visible, overflow characters are kept, and skipped characters are marked.
- Code mode auto-advances through indentation, and the caret is positioned from
  the DOM instead of by arithmetic — no more drift on wrapping or zoom. (#4)
- Settings were renamed and given real types (booleans are booleans, counts are
  numbers). Version 1 settings are migrated on first run.
- The panel follows the editor theme through `--vscode-*` tokens instead of
  recolouring itself with a colour library.
- Syntax highlighting builds a token map with Prism instead of re-parsing
  highlighted HTML.

### Fixed

- Switching the programming language now regenerates the snippet. (#10)
- Dead keys, AltGr and IME composition are handled through `input` events, so
  the French <kbd>`</kbd> and CJK layouts work. (#12)
- `punjabi` was offered in the settings but had no word list; it is gone.
- The webview no longer loads a script from a CDN, and now runs under a strict
  Content-Security-Policy with a nonce.

### Removed

- The `dompurify`, `tinycolor` and vendored Prism scripts.

## [1.1.0]

- Added Turkish.

## [1.0.2]

- Initial published versions.
