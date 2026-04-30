import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

export default defineConfig({
  plugins: [
    webExtension({
      browser: "firefox",
      additionalInputs: ["src/confirmation/index.html"],
      transformManifest(manifest) {
        const sw = manifest.background?.service_worker;
        if (sw) {
          manifest.background = { scripts: [sw] };
        }
        return manifest;
      },
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
