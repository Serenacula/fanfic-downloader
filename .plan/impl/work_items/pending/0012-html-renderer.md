---
id: 0012-html-renderer
status: pending
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0009-cover-image-generator, 0010-story-info-page]
created: 2026-04-27
started: null
completed: null
---

# HTML renderer

## What this builds

`renderHtml(data: FicData, settings: Settings): Promise<Blob>` — single-file HTML (all chapters in one document) or a zip of per-chapter HTML files when `chapterSplit` is enabled. Includes cover page and TOC as sections/separate files per settings.

## Test strategy

Manual: download a fic as HTML (combined), open in a browser, verify all chapters are present and readable. Download as HTML (split), open the zip, verify each chapter is a separate file, open one in a browser.

## Notes

Combined: one HTML file with `<section>` per chapter, inline images as data URLs. Split: one HTML file per chapter + a TOC index page, zipped with fflate. Images as data URLs in both cases (avoids broken relative paths in zip).
