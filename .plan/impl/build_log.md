# Build Log

## 2026-04-27T00:00:00

**Event:** Implementation plan created — 27 work items across 9 modules.

---

## 2026-04-27T00:01:00

**Event:** Approved impl plan — Phase 2 begins.

---

## 2026-04-27T00:02:00

**Event:** Started work item `0001-extension-scaffold` — Extension scaffold

---

## 2026-04-27T00:03:00

**Event:** Completed work item `0001-extension-scaffold` — Extension scaffold

Files created: `manifest.json`, `vite.config.ts`, `tsconfig.json`, `package.json` (scripts: build/dev/test), `src/background/index.ts`, `src/popup/index.html`, `src/popup/index.ts`, `src/options/index.html`, `src/options/index.ts`, `src/content/index.ts`, `public/icons/icon-{16,32,48,128}.png` (placeholder). `npm run build` produces clean dist/.

---

## 2026-04-27T00:04:00

**Event:** Completed work item `0002-fic-data-model` — Fic data model types

Files created: `src/shared/types.ts`. `tsc --noEmit` passes. Also fixed tsconfig: removed `rootDir`/`outDir` (Vite owns the build), added `DOM` to lib. Metadata types included for all 9 target sites.

---

## 2026-04-27T00:05:00

**Event:** Completed work item `0003-settings-schema` — Settings schema and storage helpers

Files created: `src/shared/settings.ts`. `Settings` type, `DEFAULT_SETTINGS`, `getSettings()`, `saveSettings()`, `RendererFn`. Moved `RendererFn` here (not types.ts) to avoid circular import since Settings uses SiteId from types.ts.

---

## 2026-04-27T00:06:00

**Event:** Completed work item `0005-request-queue` — Request queue

Files created: `src/background/request-queue.ts`, `src/background/__tests__/request-queue.test.ts`. 4/4 tests pass. Exported `createQueue()` factory for test isolation. Key design: `inFlight` incremented synchronously before dispatch to prevent concurrent drain calls overclaiming slots; drain guard prevents re-entrant drain; rate limit re-checked on each while-loop iteration.

---

## 2026-04-27T00:07:00

**Event:** Completed work items `0006-ao3-parser`, `0007-ffn-parser`, `0008-site-detection` together

Files created: `src/parsers/common.ts` (Parser interface, fetchHtml, sanitizeHtml, fetchImages, helpers), `src/parsers/ao3.ts`, `src/parsers/ffn.ts`, `src/parsers/index.ts` (detectParser, isFicPage). Unit tests for site detection: 9/9 pass. Parsers require manual integration testing against live sites.

---

## 2026-04-27T00:08:00

**Event:** Completed work items `0009-cover-image-generator` and `0010-story-info-page`

Files created: `src/renderers/cover.ts` (OffscreenCanvas PNG generator), `src/renderers/story-info.ts` (renderStoryInfoHtml, renderStoryInfoText). 4 unit tests for story-info, all pass.

---

Files created: `src/parsers/common.ts` (Parser interface, fetchHtml, sanitizeHtml, fetchImages, helpers), `src/parsers/ao3.ts`, `src/parsers/ffn.ts`, `src/parsers/index.ts` (detectParser, isFicPage). Unit tests for site detection: 9/9 pass. Parsers require manual integration testing against live sites.

---

Files created: `src/background/request-queue.ts`, `src/background/__tests__/request-queue.test.ts`. 4/4 tests pass. Exported `createQueue()` factory for test isolation. Key design: `inFlight` incremented synchronously before dispatch to prevent concurrent drain calls overclaiming slots; drain guard prevents re-entrant drain; rate limit re-checked on each while-loop iteration.

---

Files created: `src/shared/settings.ts`. `Settings` type, `DEFAULT_SETTINGS`, `getSettings()`, `saveSettings()`, `RendererFn`. Moved `RendererFn` here (not types.ts) to avoid circular import since Settings uses SiteId from types.ts.

---

Files created: `src/shared/types.ts`. `tsc --noEmit` passes. Also fixed tsconfig: removed `rootDir`/`outDir` (Vite owns the build), added `DOM` to lib. Metadata types included for all 9 target sites.

---

Files created: `manifest.json`, `vite.config.ts`, `tsconfig.json`, `package.json` (scripts: build/dev/test), `src/background/index.ts`, `src/popup/index.html`, `src/popup/index.ts`, `src/options/index.html`, `src/options/index.ts`, `src/content/index.ts`, `icons/icon-{16,32,48,128}.png` (placeholder). `npm run build` produces clean dist/.

---
