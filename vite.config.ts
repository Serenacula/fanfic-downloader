import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PDF_FONTS = [
  "Roboto-Regular.ttf",
  "Roboto-Medium.ttf",
  "Roboto-Italic.ttf",
  "Roboto-MediumItalic.ttf",
];

export default defineConfig({
  plugins: [
    webExtension({
      browser: "firefox",
      additionalInputs: ["src/confirmation/index.html"],
      // vite-plugin-web-extension types this parameter via webextension-polyfill's
      // Browser namespace, which this project doesn't have installed (it uses
      // @types/firefox-webext-browser instead) — annotate locally to avoid relying
      // on that unresolved type.
      transformManifest(manifest: {
        background?: { service_worker?: string; scripts?: string[] };
      }) {
        const sw = manifest.background?.service_worker;
        if (sw) {
          manifest.background = { scripts: [sw] };
        }
        return manifest;
      },
    }),
    {
      name: "copy-pdf-fonts",
      closeBundle() {
        const destDir = resolve("dist/fonts");
        mkdirSync(destDir, { recursive: true });
        const srcDir = resolve("node_modules/pdfmake/build/fonts/Roboto");
        for (const file of PDF_FONTS) {
          copyFileSync(resolve(srcDir, file), resolve(destDir, file));
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    cssMinify: false,
  },
});
