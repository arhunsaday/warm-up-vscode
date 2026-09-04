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
| `pnpm dev:website` | Run the landing page locally |
| `pnpm build:website` | Build the landing page into `website/dist` |
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
core/            The typing engine and its data. No VS Code, no React.
  engine/        Pure logic — fully unit tested
  data/          Word lists, quotes and code snippets
shared/          Types shared by every app
  settings.ts    The one definition of every setting — package.json is checked against it
  messages.ts    The postMessage contract
src/             Extension host (bundled to dist/extension.cjs by tsup)
  editorSession.ts  Typing in a real editor tab
webview/src/     The panel, in React (bundled to dist/webview/* by vite)
website/src/     The landing page, in React (deployed to Vercel)
```

Imports use the `@core/*` and `@shared/*` aliases, declared once in
`tsconfig.json` and mirrored in each Vite config.

The rule that keeps this maintainable: **game logic lives in `core/engine` and
stays pure.** The panel, the editor session and the website are three different
front-ends over the same engine — which is also why the website demo behaves
exactly like the extension. If a rule about typing needs a test, it belongs in
`core/engine`.

## Adding a language

1. Drop a JSON array of words in `webview/src/data/words/<language>.json`. Around
   200 common words is the right size; keep them lowercase and unpunctuated.
2. Add the name to `NATURAL_LANGUAGES` in `shared/settings.ts`, to the
   `warmUp.language` enum in `package.json`, and to `WORDS` in
   `webview/src/data/index.ts`.
3. Add a display label in `LANGUAGE_LABELS` (the endonym, e.g. `français`).
4. Run `pnpm test` — the schema tests will tell you if you missed a spot.

## Adding quotes

Quotes live in `core/data/quotes/<language>.json` as `{ text, source }`.

**Only public-domain sources.** Anything published before 1929, government
documents, and old translations are safe; song lyrics, modern books and
internet aphorisms are not. Always fill in `source` — it is shown on the
results screen.

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
