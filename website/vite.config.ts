import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * The marketing site. It imports the extension's real typing engine from
 * `@core`, so the demo on the landing page is the product rather than a
 * recording of it.
 */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("../core", import.meta.url)),
      "@ui": fileURLToPath(new URL("../ui", import.meta.url)),
      "@shared": fileURLToPath(new URL("../shared", import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      // React Router ships "use client" directives that mean nothing to a
      // client-only bundle; the warning is noise.
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
          return;
        }
        warn(warning);
      },
    },
  },
});
