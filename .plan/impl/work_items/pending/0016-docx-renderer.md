---
id: 0016-docx-renderer
status: pending
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0009-cover-image-generator, 0010-story-info-page]
created: 2026-04-27
started: null
completed: null
---

# DOCX renderer

## What this builds

`renderDocx(data: FicData, settings: Settings): Promise<Blob>` — single DOCX file or zip of per-chapter DOCX files. Uses docx.js for generation. Cover page (if enabled), TOC (if enabled), story info section, chapter content with headings.

## Test strategy

Manual: download a fic as DOCX, open in LibreOffice Writer or Word, verify formatting, cover page, TOC, and chapter structure are correct.

## Notes

docx.js generates `.docx` blobs without a DOM. HTML content needs conversion to docx.js Paragraph/TextRun structures. Images embedded as base64. For the split/zip case, generate one Document per chapter and zip with fflate.
