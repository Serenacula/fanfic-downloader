---
id: 0020-popup-shell
status: pending
module: download-manager-ui
implements: [download-flow-2e6c]
depends_on: [0001-extension-scaffold]
created: 2026-04-27
started: null
completed: null
---

# Popup shell

## What this builds

The browser action popup container: HTML/CSS layout, screen routing (download list → confirmation form → URL input, back navigation), and the messaging client that communicates with the orchestrator. No screen content yet — just the shell that screens slot into.

## Test strategy

Manual: open popup, confirm it renders without errors. Navigate to a screen (stub content), confirm back navigation works.

## Notes

Vanilla TypeScript + CSS, no framework needed for a popup this size. Screen routing is a simple state variable — no router library required. The messaging client wraps `browser.runtime.sendMessage` with typed request/response shapes matching the orchestrator's API.
