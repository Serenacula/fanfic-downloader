---
id: 0002-chapter-split-files
node: format-generation-9f5a
status: answered
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# When "chapters as individual files" is enabled, what does that mean per format?

## Context

Some formats are inherently single-document; others can be split per chapter. The setting needs consistent behaviour across formats.

## Answer

- **ePub**: Always a single file with chapters as spine items (standard ePub structure). The chapter-split setting is greyed out in settings when ePub is selected, with helper text explaining ePub doesn't support chapter separation.
- **PDF, DOCX, ODT**: One file per chapter when split is enabled; delivered as a zip. One combined document when disabled.
- **HTML, Markdown, TXT**: One file per chapter when split is enabled; delivered as a zip. One combined file when disabled.

## Rationale

ePub's spine structure is equivalent to individual chapters — splitting into multiple ePub files would be unusual and inconvenient for readers. Greying out the setting with explanatory text is cleaner than silently ignoring it.

## Drop / defer reason
