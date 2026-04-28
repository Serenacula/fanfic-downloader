---
id: 0015-pdf-renderer
status: complete
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0009-cover-image-generator, 0010-story-info-page]
created: 2026-04-27
started: 2026-04-28
completed: 2026-04-28
---

# PDF renderer

## What this builds

`renderPdf(data: FicData, settings: Settings): Promise<Blob>` — single PDF or zip of per-chapter PDFs. Uses pdfmake for text-searchable output. Cover page (if enabled), TOC (if enabled), story info, chapter content.

## Test strategy

Manual: download a fic as PDF, open in a PDF reader, verify text is selectable (not image-based), cover page shows, TOC works, all chapters present.

## Notes

pdfmake works in browser/SW contexts without a server. HTML content must be converted to pdfmake's document definition format (similar to the HTML-to-plaintext conversion but with style preservation via pdfmake's style system). Images embedded as base64 data URLs. Limitation: complex HTML formatting may not render perfectly — acceptable per the open concern in overview.md.
