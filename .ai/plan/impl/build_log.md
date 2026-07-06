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

## 2026-04-28T00:01:00

**Event:** Completed work items `0011` through `0016` — all format renderers

Files created: `src/renderers/utils.ts` (htmlToText, htmlToMarkdown, zipFiles, formatFilename), `src/renderers/txt.ts`, `src/renderers/markdown.ts`, `src/renderers/html.ts`, `src/renderers/epub.ts`, `src/renderers/pdf.ts`, `src/renderers/docx.ts`. All type-check cleanly. Renderers require manual smoke testing. Dependencies added: fflate, pdfmake, docx, @types/pdfmake.

---

## 2026-04-28T00:02:00

**Event:** Completed work items `0018-download-orchestrator` and `0019-download-by-url`

Files created: `src/background/orchestrator.ts` (job lifecycle management, message API, renderer dispatch). Updated `src/background/index.ts` to wire message handler + keepalive alarm. Added `alarms` permission to manifest.

---

## 2026-04-28T00:04:00

**Event:** Completed work items `0026-royal-road-parser` and `0027-remaining-site-parsers` — all 9 site parsers implemented

Files created: `src/parsers/royalroad.ts`, `src/parsers/tapas.ts`, `src/parsers/scribblehub.ts`, `src/parsers/wattpad.ts`, `src/parsers/xenforo.ts` (shared XenForo factory exporting SpaceBattles, SufficientVelocity, and QuestionableQuesting parsers). All parsers registered in `src/parsers/index.ts`. Host permissions and content_script matches added to `manifest.json` for all sites. Also corrected `types.ts`: replaced `fanficsdotnet`/`FanficsDotNetMetadata` with `scribblehub`/`ScribbleHubMetadata`. Full project type-checks clean; 13/13 tests pass.

---

## 2026-04-28T00:03:00

**Event:** Completed work items `0004`, `0020`–`0025` — popup UI and completion signals

Files created: `src/popup/messaging.ts`, `src/popup/popup.css`, `src/popup/screens/download-list.ts`, `src/popup/screens/url-input.ts`, `src/popup/screens/confirmation.ts`. Updated `src/popup/index.ts` (router), `src/options/index.ts` and `index.html` (full settings page). Icon badge and page toast injected from orchestrator after job completion. Build passes cleanly.

---

Files created: `src/background/orchestrator.ts` (job lifecycle management, message API, renderer dispatch). Updated `src/background/index.ts` to wire message handler + keepalive alarm. Added `alarms` permission to manifest.

---

Files created: `src/renderers/utils.ts` (htmlToText, htmlToMarkdown, zipFiles, formatFilename), `src/renderers/txt.ts`, `src/renderers/markdown.ts`, `src/renderers/html.ts`, `src/renderers/epub.ts`, `src/renderers/pdf.ts`, `src/renderers/docx.ts`. All type-check cleanly. Renderers require manual smoke testing. Dependencies added: fflate, pdfmake, docx, @types/pdfmake.

---

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
