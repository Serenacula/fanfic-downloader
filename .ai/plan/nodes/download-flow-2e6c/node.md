---
id: download-flow-2e6c
parent: fanfic-downloader-3a8f
slug: download-flow
status: planning
atomic: false
depends_on: [content-extraction-4b1e, format-generation-9f5a, settings-8d4b]
created: 2026-04-27
updated: 2026-04-27
---

# Download Flow

## Purpose

The end-to-end user interaction for downloading a fic: detecting that the user is on a fic page, surfacing the download affordance, optionally showing the confirmation dialogue, orchestrating extraction and format generation, and handing the finished file to Firefox's download API.

## Scope

**In scope:**

- Download manager popup (browser action): active/recent download list, "Download" button, "Download by URL" button
- Per-download progress display (e.g. "Fetching chapter 12/50", complete, failed)
- Pre-download confirmation dialogue as inline popup screen (when enabled in settings)
- "Download by URL" flow: URL input → site detection → confirmation (if enabled) → download
- Multiple concurrent downloads
- Error handling: user-facing messages for extraction failures, unsupported sites/URLs, network errors
- Handing finished file to `browser.downloads.download()`
- Firefox's default download folder (no custom folder — that's fanfic-downloader-expanded)

**Out of scope:**

- Custom folder routing (fanfic-downloader-expanded)
- Auto-download triggers (fanfic-downloader-expanded)
- Actual extraction and format logic (content-extraction, format-generation)

## Decisions

- **Confirmation dialogue**: Optional, togglable in settings. Fields: title, author, series, summary (from root `0007-metadata-editing`).
- **Download manager popup** (from `0002-download-manager`): Extension icon always opens a popup. Contains: active/recent downloads list with per-download progress, "Download" button (greyed out when not on a fic page), "Download by URL" button with inline URL input. Confirmation dialogue (when enabled) appears as an inline screen within the popup. Icon never greyed out — popup accessible from any tab.
- **Concurrency model** (from `0003-concurrency-model`): Global chapter request queue. All fic downloads enqueue their chapters into one shared queue. Max 3 concurrent requests (fixed). Minimum delay between requests is user-configurable. Per-fic progress tracked and displayed independently.
- **Completion/failure signals** (from `0004-completion-behaviour`): Three in-browser signals: (1) popup entry status update, (2) icon badge (✓ / !), cleared on popup open, (3) injected page toast, bottom-right, 2-second auto-dismiss. No OS notifications.
- **History retention** (from `0005-history-retention`): Session only — persists across popup opens, cleared on Firefox restart.
- **Filename template** (from `0006-filename`): User-configurable template, default `{title} - {author}`. Keywords: title, author, currentDate, publishDate, updateDate. Extension appended automatically.
- **Cancel/retry**: In-progress downloads have a cancel button; failed downloads have a retry button. Both in the popup list.

## Children

_None yet._

## Open threads

_None yet._

## Considered but rejected

_None._

## Notes

_Multi-chapter fics require fetching multiple pages sequentially — progress feedback is important for UX._
