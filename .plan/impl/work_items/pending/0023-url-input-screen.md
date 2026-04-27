---
id: 0023-url-input-screen
status: pending
module: download-manager-ui
implements: [download-flow-2e6c]
depends_on: [0020-popup-shell, 0019-download-by-url]
created: 2026-04-27
started: null
completed: null
---

# URL input screen

## What this builds

The "Download by URL" screen: a text input for pasting a fic URL, a Submit button, and inline error display for unsupported sites or invalid URLs. On successful submission, navigates back to the download list screen where the new job appears.

## Test strategy

Manual: click "Download by URL", paste an AO3 URL, submit, confirm navigation back to list and new job appears. Paste an unsupported URL, confirm inline error message. Paste a malformed URL, confirm appropriate error.

## Notes

Calls `startDownloadByUrl` via the messaging client. Error messages: `'unsupported-site'` → "This site isn't supported yet", `'invalid-url'` → "That doesn't look like a valid URL".
