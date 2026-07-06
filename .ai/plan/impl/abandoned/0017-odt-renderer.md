---
id: 0017-odt-renderer
status: abandoned
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0009-cover-image-generator, 0010-story-info-page]
created: 2026-04-27
started: null
completed: null
---

# ODT renderer

## What this builds

`renderOdt(data: FicData, settings: Settings): Promise<Blob>` — single ODT file or zip of per-chapter ODT files.

## Test strategy

Manual: download a fic as ODT, open in LibreOffice Writer, verify content is readable with correct structure.

## Notes

ODT is an ODF zip archive (like ePub). Hand-rolled: generate `content.xml`, `styles.xml`, `meta.xml`, `mimetype`, `META-INF/manifest.xml` and zip with fflate.

## Abandonment reason

Dropped before implementation. DOCX is the equivalent editable format and docx.js handles it well. ODT hand-rolling is 2–3 days of effort and no one has explicitly asked for it. Can be resurrected if a user requests ODT support. Resurrection is straightforward — the XML structure is mechanical once DOCX is done.
