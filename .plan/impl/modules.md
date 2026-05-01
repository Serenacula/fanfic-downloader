---
updated: 2026-04-27
---

# Modules

## `scaffolding`

**Responsibility:** The extension skeleton — everything that makes the plugin a valid, loadable Firefox WebExtension without any application logic. Manifest V3 file, background service worker entry point (empty shell), browser action popup entry, options page entry, content script entry, Vite build config, package.json, dev tooling.
**Implements spec nodes:** `scaffolding-7c2d`
**Depends on modules:** none
**Path in repo:** `fanfic-downloader/` (root of plugin); `fanfic-downloader/manifest.json`, `fanfic-downloader/vite.config.ts`

### Notes

TypeScript + Vite. Use `@webext-core/vite-plugin` or `vite-plugin-web-extension` for MV3 bundling. Permissions declared: `downloads`, `activeTab`, `storage`, `scripting`, plus host permissions for AO3 and FFN (initial). Options page registered; browser action registered (always-popup mode).

---

## `shared-types`

**Responsibility:** All TypeScript interfaces that are shared across modules. The contract between parsers and renderers. Nothing else may define the core fic data shape.
**Implements spec nodes:** `data-model-c3f1`
**Depends on modules:** none
**Path in repo:** `fanfic-downloader/src/types/`

### Notes

Key types: `FicChapter` (title?, content: string, index, beginning_notes?, end_notes?), `FicImage` (id, mimeType, data: ArrayBuffer), `FicCore` (title, author, summary, chapters, images, wordCount, status, published, updated, sourceUrl, series?), `AO3Metadata`, `FFNMetadata`, `FicData` (core + site-specific metadata via discriminated union on `site` field). Also: `Settings` type + `RendererFn` interface `(data: FicData, settings: Settings) => Promise<Blob>`.

---

## `settings`

**Responsibility:** All interaction with `browser.storage.local` for user preferences. Typed read/write helpers, default values, and the full settings options page UI.
**Implements spec nodes:** `settings-8d4b`
**Depends on modules:** `shared-types`
**Path in repo:** `fanfic-downloader/src/settings/`

### Notes

Settings keys: format, includeImages, includeCoverImage, includeCoverPage, includeToc, includeAuthorNotes, chapterSplit, includeChapterTitles, confirmationDialogue, rateLimit (ms), filenameTemplate, storyInfoFields (per-site object). Options page is a full tab; link surfaced via gear icon in popup.

---

## `request-queue`

**Responsibility:** The global HTTP request queue used by all site parsers. Enforces max 3 concurrent in-flight requests, minimum configurable delay between dispatches, exponential backoff on failure with configurable retry limit.
**Implements spec nodes:** `content-extraction-4b1e` (fetch strategy decisions)
**Depends on modules:** `settings`
**Path in repo:** `fanfic-downloader/src/request-queue/`

### Notes

Exported as a singleton service instantiated in the background SW. Parsers call `queue.fetch(url, options)` rather than raw `fetch()`. Queue reads the rate limit setting at dispatch time (not at enqueue time) so setting changes take effect without restart.

---

## `site-parsers`

**Responsibility:** Site-specific extraction logic. Each parser takes a fic URL, uses the request queue to fetch all chapters and images, and returns a `FicData` object. Site detection maps a URL to the correct parser.
**Implements spec nodes:** `content-extraction-4b1e`, `dedicated-parsers-e4d9`, `forum-parsers-b8c5`, `site-detection-a7b2`
**Depends on modules:** `shared-types`, `request-queue`, `settings`
**Path in repo:** `fanfic-downloader/src/parsers/`

### Notes

One subdirectory per site: `parsers/ao3/`, `parsers/ffn/`, etc. `parsers/index.ts` exports `detectParser(url: string): Parser | null` and `getSupportedPatterns(): string[]` (used by manifest content_scripts). Each parser exports `parse(url: string, settings: Settings): Promise<FicData>`.

---

## `format-renderers`

**Responsibility:** Converts a `FicData` object into a downloadable file `Blob` in the user's chosen format. Shared helpers for cover image generation and story info page HTML. One renderer per format.
**Implements spec nodes:** `format-generation-9f5a`
**Depends on modules:** `shared-types`, `settings`
**Path in repo:** `fanfic-downloader/src/renderers/`

### Notes

Libraries: ePub — hand-rolled zip (fflate) + standard OPF/NCX/XHTML; PDF — pdfmake; DOCX — docx.js; HTML/Markdown/TXT — hand-rolled. ODT dropped (not implemented unless explicitly requested). Each renderer exports `render(data: FicData, settings: Settings): Promise<Blob>`. Zipping for multi-file formats uses fflate. Cover image generated via OffscreenCanvas.

---

## `download-orchestrator`

**Responsibility:** The background service worker application logic. Manages download jobs (create, track, cancel, retry), coordinates parsers and renderers, hands finished files to `browser.downloads.download()`, persists session state, and exposes a message-passing API for the popup to consume.
**Implements spec nodes:** `download-flow-2e6c` (orchestration aspects)
**Depends on modules:** `shared-types`, `settings`, `request-queue`, `site-parsers`, `format-renderers`
**Path in repo:** `fanfic-downloader/src/orchestrator/`

### Notes

Job state machine: `queued → fetching-metadata → fetching-chapters → rendering → saving → complete | failed`. State persisted to `browser.storage.session` (cleared on restart — matches session-only history decision). Message API uses `browser.runtime.sendMessage` / `onMessage`. Background SW keeps-alive pattern needed for Firefox MV3.

---

## `download-manager-ui`

**Responsibility:** The browser action popup — the entire user-facing download interface. Screens: download list (main), confirmation form, URL input. Communicates with the orchestrator via message passing.
**Implements spec nodes:** `download-flow-2e6c` (UI aspects)
**Depends on modules:** `download-orchestrator`, `settings`
**Path in repo:** `fanfic-downloader/src/popup/`

### Notes

Single-page popup with screen routing (no full navigation stack needed). Polls orchestrator every ~500ms for job state updates (or uses message push if SW is active). Confirmation form fields: title, author, series, summary — prefilled from parsed FicData. "Download by URL" input accepts any URL; shows inline error for unsupported sites.

---

## `notification-layer`

**Responsibility:** The two in-browser completion/failure signals beyond the popup: icon badge (✓ / !) and injected page toast (bottom-right, 2-second dismiss).
**Implements spec nodes:** `download-flow-2e6c` (completion signals)
**Depends on modules:** `download-orchestrator`
**Path in repo:** `fanfic-downloader/src/notifications/`

### Notes

Icon badge lives in background SW, updated via `browser.action.setBadgeText()`. Toast is a content script (`notifications/toast.ts`) injected via `browser.scripting.executeScript()` when a job completes/fails; creates a styled DOM element, auto-removes after 2s. Badge cleared when popup opens.
