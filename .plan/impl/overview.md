---
created: 2026-04-27
updated: 2026-04-27
spec_root: root-7f3a
---

# Implementation Plan: fic-downloader

## Approach

We build the `fic-downloader` Firefox plugin in layers, from the inside out: shared types first, then services (settings, request queue), then parsers and renderers as parallel tracks, then the orchestrator that ties them together, then the UI on top.

The initial build targets AO3 + FFN + ePub only — the minimum viable product. Each subsequent site and format is a self-contained addition that slots into the existing architecture without changing the core. Forum sites (SB/SV/QQ) and the remaining formats are planned work items that can be tackled in any order after the initial build is proven.

The extension architecture is: content scripts handle site detection and page communication; the background service worker owns the download orchestrator and request queue; the popup and options page are standard WebExtension UI pages. TypeScript throughout, Vite for bundling.

## Modules

- `scaffolding` — Extension skeleton: manifest, background SW entry, popup entry, options entry, Vite config
- `shared-types` — TypeScript interfaces for FicData, FicChapter, per-site metadata, settings schema
- `settings` — browser.storage.local read/write helpers + settings options page UI
- `request-queue` — Global chapter fetch queue (max 3 concurrent, rate limiting, retry-with-backoff)
- `site-parsers` — Site-specific extractors: AO3, FFN (initial); RR, Tapas, SH, Wattpad, SB, SV, QQ (feature-complete)
- `format-renderers` — Per-format output generators: ePub, PDF, HTML, Markdown, DOCX, TXT, ODT + shared cover-image and story-info helpers
- `download-orchestrator` — Background SW logic: job lifecycle, queue coordination, progress tracking, file hand-off to browser.downloads
- `download-manager-ui` — Browser action popup: download list, confirmation form, URL input screens
- `notification-layer` — Icon badge updates + injected page toast

## Build phases

**Phase 1 — Foundation:** scaffold + shared types. Nothing else can start without these.

**Phase 2 — Services:** settings schema + request queue. Parallel, no inter-dependency.

**Phase 3 — Initial parsers:** AO3 + FFN + site detection. Parallel parser builds.

**Phase 4 — Renderers:** cover image, story info page, then all format renderers. Cover image and story info are shared dependencies for all renderers; the renderers themselves are parallel.

**Phase 5 — Orchestrator:** download orchestrator core + "download by URL" flow.

**Phase 6 — UI:** settings page, popup shell and all popup screens. Popup screens depend on the orchestrator.

**Phase 7 — Notifications:** icon badge + page toast.

**Phase 8 — Feature-complete parsers:** remaining site parsers added as individual work items.

## Open concerns

- ~~**ODT renderer**~~: Dropped. Hand-rolling is 2–3 days effort; DOCX covers the editable-document use case. Resurrect if users request it.
- **PDF quality**: pdfmake produces text-searchable PDFs but layout control is limited. Complex fic formatting (tables, custom fonts) may render poorly. Acceptable for MVP but worth flagging.
- **Popup state and background SW communication**: Firefox MV3 service workers can be suspended. The popup needs to handle the SW not being immediately available. This is a known Firefox extension pattern; needs careful implementation.
- **DOCX per-chapter zip**: The `docx.js` library generates a single document; producing one DOCX per chapter means multiple library calls and zipping. Should be straightforward but untested.
