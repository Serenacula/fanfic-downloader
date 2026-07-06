---
id: 0021-download-list-screen
status: complete
module: download-manager-ui
implements: [download-flow-2e6c]
depends_on: [0018-download-orchestrator, 0020-popup-shell, 0008-site-detection]
created: 2026-04-27
started: 2026-04-28
completed: 2026-04-28
---

# Download list screen

## What this builds

The main popup screen. Shows: active and recently completed/failed downloads with per-job progress (e.g. "Fetching 12/50 chapters", "Rendering…", "Complete", "Failed — click to retry"). "Download" button (greyed out with tooltip when current tab is not a recognised fic page). "Download by URL" button. Gear icon linking to settings tab. Cancel button on in-progress jobs.

## Test strategy

Manual: with an active download in progress, open popup, confirm progress updates live. Confirm "Download" button is greyed out on a non-fic page and active on an AO3 fic page. Confirm cancel button stops the download. Confirm completed jobs show status. Confirm gear icon opens settings tab.

## Notes

The popup polls `getJobs()` every 500ms while open, or uses message push events from the SW when available. Current tab URL is retrieved via `browser.tabs.query({ active: true, currentWindow: true })` to determine if the "Download" button should be enabled.
