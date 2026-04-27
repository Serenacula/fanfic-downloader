---
id: 0010-story-info-page
status: pending
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0002-fic-data-model, 0003-settings-schema]
created: 2026-04-27
started: null
completed: null
---

# Story info page generator

## What this builds

`renderStoryInfoHtml(data: FicData, settings: Settings): string` — produces a self-contained HTML fragment (no `<html>`/`<body>` wrapper) containing the fic's metadata fields, respecting the `storyInfoFields` setting. Handles per-site metadata by switching on `data.site`. Used by all format renderers that include a cover page.

## Test strategy

Unit test: call `renderStoryInfoHtml` with AO3 FicData and default settings, confirm output HTML contains title, author, fandom. Call with `storyInfoFields.ao3.fandoms = false`, confirm fandom is absent. Call with FFN FicData, confirm FFN-specific fields render correctly.

## Notes

Output is styled HTML intended to be embedded in ePub, HTML, and PDF outputs. Markdown and TXT renderers will call a separate plain-text variant. Fields rendered per site: AO3 — fandom, relationships, characters, additional tags, warnings, rating, word count, status, dates, series. FFN — fandoms, genre, characters, word count, status, dates.
