---
id: settings-8d4b
parent: fic-downloader-3a8f
slug: settings
status: planning
atomic: false
depends_on: []
created: 2026-04-27
updated: 2026-04-27
---

# Settings

## Purpose

The options page and preference storage layer. Exposes all user-configurable behaviour and persists choices via `browser.storage`.

## Scope

**In scope:**
- Output format selection (ePub, PDF, HTML, Markdown, DOCX, TXT)
- Include inline images toggle (greyed out / note for TXT — deferred)
- Include cover image toggle (independent of inline images)
- Cover page toggle (default: on)
- Table of contents toggle (default: on)
- Story info field configuration (which fields to include, e.g. tags, summary, word count, etc.)
- Pre-download confirmation dialogue toggle
- Chapters as individual files vs single combined file toggle (greyed out for ePub with helper text)
- Include chapter titles toggle
- Include author notes toggle (default: off)
- Filename template string editor (default: `{title} - {author}`; keywords: title, author, currentDate, publishDate, updateDate; extension appended automatically)
- Configurable rate limiting (delay between chapter fetches)
- Options page UI
- "Reset to defaults" button

**Out of scope:**
- Custom download folder (fic-downloader-expanded)
- Auto-download triggers (fic-downloader-expanded)

## Decisions

- **Settings page location** (from `0001-settings-page-location`): Full tab via `browser.runtime.openOptionsPage()`. Popup slot is used by download manager.
- **Storage backend** (from `0002-storage-backend`): `browser.storage.local`. Device-specific settings, consistent with fic-downloader-expanded (folder paths differ per device). Also keeps both plugins consistent if they're ever merged.

## Children

_None yet._

## Open threads

_None yet._

## Considered but rejected

_None._

## Notes

_User is considering potentially merging fic-downloader and fic-downloader-expanded into a single plugin. Storage and settings architecture should remain consistent between the two._
