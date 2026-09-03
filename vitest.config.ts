import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The VS Code integration suite lives in `src/test` and runs through
    // `@vscode/test-cli` instead; it needs a real editor host.
    include: ["webview/src/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["webview/src/engine/**", "shared/**"],
    },
  },
});
