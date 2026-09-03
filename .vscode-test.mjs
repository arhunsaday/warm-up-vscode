import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "dist/test/**/*.test.cjs",
  version: "stable",
  mocha: { ui: "tdd", timeout: 20000 },
});
