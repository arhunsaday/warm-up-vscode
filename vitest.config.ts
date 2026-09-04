import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./core", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
    },
  },
  test: {
    // The VS Code integration suite lives in `src/test` and runs through
    // `@vscode/test-cli` instead; it needs a real editor host.
    include: ["core/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["core/**", "shared/**"],
    },
  },
});
