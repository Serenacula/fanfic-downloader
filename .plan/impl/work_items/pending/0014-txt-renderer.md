---
id: 0014-txt-renderer
status: pending
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0010-story-info-page]
created: 2026-04-27
started: null
completed: null
---

# TXT renderer

## What this builds

`renderTxt(data: FicData, settings: Settings): Promise<Blob>` — single `.txt` file or zip of per-chapter `.txt` files. Story info as a plain-text header block. HTML stripped to plain text.

## Test strategy

Manual: download a fic as TXT, open in a text editor, verify readable plain text, story info header present, chapter breaks clearly delineated.

## Notes

HTML-to-plaintext: strip all tags, decode HTML entities, preserve line breaks from `<br>` and `<p>` as double newlines. Images: deferred per spec (`0006-image-handling-txt`) — `<img>` tags stripped silently for now. Chapter separator: `---` + chapter title (if titles enabled) on its own line.
