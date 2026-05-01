---
id: format-generation-9f5a
parent: fanfic-downloader-3a8f
slug: format-generation
status: planning
atomic: false
depends_on: [content-extraction-4b1e]
created: 2026-04-27
updated: 2026-04-27
---

# Format Generation

## Purpose

Takes the normalised fic data from content-extraction and produces a downloadable file in the user's chosen format.

## Scope

**In scope:**

- ePub generation
- PDF generation
- HTML generation (single file)
- Markdown generation
- DOCX generation
- TXT generation
- Image embedding per format (where supported)
- Story info page / front matter per format
- Chapters as individual files vs single combined file (per settings)
- Chapter title inclusion toggle (per settings)
- TXT image handling (deferred, question 0006)

**Out of scope:**

- Content extraction (content-extraction)
- Format selection UI (settings / download-flow)

## Decisions

- **MOBI/AZW3 dropped** (from `0001-mobi-azw3`): Not implemented, not mentioned. ePub covers the Kindle use case on modern devices.
- **Chapter split behaviour** (from `0002-chapter-split-files`): ePub always uses spine items (single file); chapter-split setting greyed out for ePub with explanatory text. All other formats: individual files per chapter delivered as a zip when split is enabled; single combined file when disabled.
- **Cover page**: Included by default; togglable in settings. A formatted front page with title, author, summary, and selected metadata fields. Present in all formats.
- **Table of contents**: Included by default; togglable in settings. Clickable/navigable in ePub (required by spec) and HTML; present in PDF and DOCX where format supports it.
- **Cover image**: Included by default; togglable in settings. A generated title card (title + author on a plain background) embedded as the cover. Setting is independent of the inline images toggle.
- **Author notes**: Excluded by default; togglable in settings. Per-chapter beginning/end notes and work-level notes rendered as visually distinct sections when enabled.

## Children

_None yet — will likely decompose per format or per format group._

## Open threads

_None yet._

## Considered but rejected

_None._

## Notes

_Some formats (ePub, DOCX, ODT) may be generated via libraries; others (Markdown, TXT, HTML) can be hand-rolled. Library choices TBD._
