---
id: 0004-completion-behaviour
node: download-flow-2e6c
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# What happens when a download completes or fails?

## Context

The file is handed to `browser.downloads.download()`. The user may not be looking at the popup.

## Options (if any)

- **Nothing extra**: popup entry updates silently.
- **Browser notification on completion**: system-level notification.
- **Browser notification on failure only**: quiet on success, noisy on error.

## Answer

All three in-browser signals fire on completion/failure:

1. **Popup entry update**: status changes to "Complete" or "Failed" in the download manager list.
2. **Icon badge**: a symbol on the extension icon (✓ complete, ! failure). Cleared when popup is opened.
3. **Injected page toast**: brief banner in the current tab, bottom-right corner, disappears after 2 seconds.

No OS-level notifications. All signals are browser-contained.

## Rationale

User wants visibility without leaving the browser. All three together cover: glancing at the icon, having the popup open, and being focused on the page.

## Drop / defer reason
