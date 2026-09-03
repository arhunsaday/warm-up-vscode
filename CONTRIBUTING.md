# Contributing

Thanks for helping out. Bug reports, languages, code snippets and features are all
welcome.

## Setup

```bash
pnpm install
pnpm build
```

Then press <kbd>F5</kbd> in VS Code to launch an extension host with Warm Up loaded.

| Command | Does |
| --- | --- |
| `pnpm dev` | Rebuild the extension and the webview on change |
| `pnpm dev:webview` | Open the webview in a browser, no extension host needed |
| `pnpm test` | Unit tests (vitest) |
| `pnpm test:extension` | Integration tests, in a real VS Code |
| `pnpm lint` / `pnpm lint:fix` | Biome |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm package` | Build a `.vsix` |

### Browser preview

`pnpm dev:webview` serves `webview/preview.html`, which stubs the VS Code API and
a slice of its theme variables. It is the fastest way to work on the UI — hot
reload, real devtools, no extension host restart. Settings come from the query
string:

```
/webview/preview.html?mode=code&programmingLanguage=rust&stopOnError=letter&theme=light
```

## Layout

```
shared/          Types shared by the extension host and the webview
  settings.ts    The one definition of every setting — package.json is checked against it
  messages.ts    The postMessage contract
src/             Extension host (bundled to dist/extension.cjs by tsup)
webview/src/     React app (bundled to dist/webview/* by vite)
  engine/        Pure typing logic — no DOM, no React, fully unit tested
  components/    Rendering only
  data/          Word lists and code snippets
```

The rule that keeps this maintainable: **game logic lives in `webview/src/engine`
and stays pure.** Components render the state the engine returns and forward
keystrokes back into it. If a rule about typing needs a test, it belongs there.

## Adding a language

1. Drop a JSON array of words in `webview/src/data/words/<language>.json`. Around
   200 common words is the right size; keep them lowercase and unpunctuated.
2. Add the name to `NATURAL_LANGUAGES` in `shared/settings.ts`, to the
   `warmUp.language` enum in `package.json`, and to `WORDS` in
   `webview/src/data/index.ts`.
3. Add a display label in `LANGUAGE_LABELS` (the endonym, e.g. `français`).
4. Run `pnpm test` — the schema tests will tell you if you missed a spot.

## Adding code snippets

Add entries to `webview/src/data/snippets/<language>.json`. Good snippets are 5–20
lines, self-contained, and use the language's ordinary idioms. Indentation is
normalised at load, so don't worry about tabs versus spaces.

To add a whole language, extend `PROGRAMMING_LANGUAGES` in `shared/settings.ts`,
the `warmUp.programmingLanguage` enum, `SNIPPETS`, and import the matching Prism
grammar in `webview/src/highlight.ts`.

## Releasing

Maintainers only: bump the version in `package.json`, update `CHANGELOG.md`, then

```bash
git tag v2.0.0 && git push origin v2.0.0
```

The release workflow verifies the tag matches the manifest, runs the full suite,
publishes to the VS Marketplace and Open VSX, and attaches the `.vsix` to a GitHub
release. It needs the `VSCE_PAT` and `OVSX_PAT` repository secrets; without them
it still builds and releases the artifact.
