---
id: 0018-download-orchestrator
status: pending
module: download-orchestrator
implements: [download-flow-2e6c]
depends_on: [0003-settings-schema, 0005-request-queue, 0008-site-detection, 0011-epub-renderer, 0012-html-renderer, 0013-markdown-renderer, 0014-txt-renderer, 0015-pdf-renderer, 0016-docx-renderer, 0017-odt-renderer]
created: 2026-04-27
started: null
completed: null
---

# Download orchestrator

## What this builds

The background service worker's application logic. Manages download jobs through their lifecycle: `queued → fetching-metadata → fetching-chapters → rendering → saving → complete | failed`. Coordinates the site parsers and format renderers. Tracks per-job progress (chapters fetched count). Persists job state to `browser.storage.session` for session-only history. Exposes a message API for the popup: `getJobs()`, `startDownload(url, overrides?)`, `cancelJob(id)`, `retryJob(id)`.

## Test strategy

Manual end-to-end: trigger a download of a short AO3 fic via the message API from the browser console. Observe job state progressing through phases. Confirm the file appears in Firefox's Downloads. Trigger a cancel mid-fetch, confirm the job stops. Trigger a retry on a failed job, confirm it restarts.

## Notes

Job IDs are UUIDs. State persisted to `browser.storage.session` (not `local`) so it's naturally cleared on browser restart. Background SW keep-alive: use an alarm or periodic message ping to prevent the SW from being suspended mid-download (Firefox MV3 SW suspension is less aggressive than Chrome but still applies). Renderer dispatch: `const renderer = renderers[settings.format]` — a map from format string to `RendererFn`.
