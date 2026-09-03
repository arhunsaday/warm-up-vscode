import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Builds the webview into two predictable files (`webview.js` / `webview.css`)
 * so the panel HTML can reference them directly and the CSP can stay strict:
 * a single nonce'd script, no dynamic imports, no CDN.
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist/webview",
    emptyOutDir: true,
    target: "es2022",
    cssCodeSplit: false,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: "webview/src/main.tsx",
      output: {
        format: "es",
        inlineDynamicImports: true,
        entryFileNames: "webview.js",
        assetFileNames: "webview.[ext]",
      },
    },
  },
});
