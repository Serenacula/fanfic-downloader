---
id: 0025-page-toast
status: pending
module: notification-layer
implements: [download-flow-2e6c]
depends_on: [0018-download-orchestrator]
created: 2026-04-27
started: null
completed: null
---

# Page toast notification

## What this builds

A brief toast notification injected into the active tab when a download completes or fails. Fixed position, bottom-right corner, auto-dismisses after 2 seconds. "Download complete: {title}" or "Download failed: {title}".

## Test strategy

Manual: complete a download while viewing a web page, confirm the toast appears bottom-right and disappears after 2 seconds. Trigger a failure, confirm failure toast appears.

## Notes

Implemented via `browser.scripting.executeScript()` — the SW injects a small self-contained script into the active tab that creates a styled `<div>`, appends it to `<body>`, sets a 2-second timeout to remove it. The injected element uses a shadow DOM to avoid style conflicts with the page. Requires `scripting` permission (already in manifest).
