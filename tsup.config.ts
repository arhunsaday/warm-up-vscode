import { defineConfig } from "tsup";

/**
 * The extension host still loads CommonJS, so the bundle is emitted as `.cjs`
 * while the repository itself is ESM.
 */
export default defineConfig({
  entry: { extension: "src/extension.ts", "test/extension.test": "src/test/extension.test.ts" },
  outDir: "dist",
  format: ["cjs"],
  outExtension: () => ({ js: ".cjs" }),
  platform: "node",
  target: "node20",
  external: ["vscode"],
  sourcemap: true,
  minify: process.env.NODE_ENV !== "development",
  treeshake: true,
  clean: false,
});
