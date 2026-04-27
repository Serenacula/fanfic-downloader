---
id: 0024-icon-badge
status: pending
module: notification-layer
implements: [download-flow-2e6c]
depends_on: [0018-download-orchestrator]
created: 2026-04-27
started: null
completed: null
---

# Icon badge

## What this builds

Background SW logic that updates the browser action icon badge when a job completes (✓) or fails (!). Badge is cleared when the popup is opened.

## Test strategy

Manual: trigger a download, complete it without opening the popup, confirm the ✓ badge appears on the icon. Open the popup, confirm badge clears. Trigger a failing download (e.g. unsupported URL), confirm ! badge.

## Notes

`browser.action.setBadgeText({ text: '✓' })` + `browser.action.setBadgeBackgroundColor`. Badge cleared in the popup's `onload` / first render by sending a `clearBadge` message to the SW.
