---
id: 0011-epub-renderer
status: complete
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0009-cover-image-generator, 0010-story-info-page]
created: 2026-04-27
started: 2026-04-28
completed: 2026-04-28
---

# ePub renderer

## What this builds

`renderEpub(data: FicData, settings: Settings): Promise<Blob>` — produces a valid ePub 3 file as a Blob. Includes: cover image (if enabled), story info page (if enabled), NCX/NAV table of contents (if enabled), all chapters as spine items, embedded images (if enabled), author notes (if enabled).

## Test strategy

Manual: download a short AO3 fic as ePub, open in Calibre or an ePub reader, verify: cover page shows, TOC lists all chapters, chapter content is correct, story info metadata renders, images appear. Validate the file is well-formed ePub using epubcheck (CLI tool).

## Notes

ePub 3 is a zip archive. Hand-rolled using `fflate` for zip construction. Structure: `mimetype`, `META-INF/container.xml`, `OEBPS/content.opf`, `OEBPS/toc.ncx`, `OEBPS/nav.xhtml`, `OEBPS/cover.xhtml` (if cover enabled), `OEBPS/info.xhtml` (if story info enabled), `OEBPS/chNN.xhtml` per chapter, `OEBPS/images/` for embedded images. Chapter split setting is inapplicable for ePub (all chapters always in one file via spine).
