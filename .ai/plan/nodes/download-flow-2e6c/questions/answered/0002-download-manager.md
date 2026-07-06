---
id: 0002-download-manager
node: download-flow-2e6c
status: answered
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# How is downloading triggered, and how is progress shown?

## Context

The need for multiple concurrent downloads requires a persistent UI surface — single-click direct download doesn't work.

## Answer

Extension icon always opens a **download manager popup** (dropdown style):

- **Active/recent downloads list**: each entry shows fic title, progress (e.g. "Fetching chapter 12/50"), status (in-progress, complete, failed).
- **"Download" button**: visible and active only when the current page is a recognised fic. Triggers download of the current fic.
- **"Download by URL" button**: always visible. Opens a URL input field (inline in the popup) where the user can paste any fic URL. Plugin detects the site and starts the download.

**Confirmation dialogue flow** (when enabled in settings): clicking "Download" or submitting a URL shows the confirmation form as an inline screen within the popup. User edits fields and confirms → download starts and appears in the list.

The extension icon is **never greyed out** — the popup is always accessible so the user can check active downloads from any tab. The "Download" button within the popup is greyed out when not on a recognised fic page.

## Rationale

User identified that multiple simultaneous downloads need a management UI. "Download by URL" was specifically requested as a feature of this popup.

## Drop / defer reason
