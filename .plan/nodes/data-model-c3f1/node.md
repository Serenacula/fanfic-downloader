---
id: data-model-c3f1
parent: content-extraction-4b1e
slug: data-model
status: planning
atomic: false
depends_on: []
created: 2026-04-27
updated: 2026-04-27
---

# Data Model

## Purpose

The TypeScript types that define the normalised fic structure every parser must produce and every renderer must consume. The contract between content-extraction and format-generation.

## Scope

**In scope:**
- Universal core type: title, author, summary, chapters, images, word_count, status, published, updated, source_url, series, work_beginning_notes, work_end_notes
- Chapter type: title (optional), content (HTML string), index, beginning_notes (optional), end_notes (optional)
- Per-site metadata types: one typed interface per supported site
- Image representation: how fetched images are stored (blob, data URL, etc.)

**Out of scope:**
- Parsing logic (dedicated-parsers, forum-parsers)
- Rendering logic (format-generation)

## Decisions

- **Shape**: Universal core + structured site-specific metadata per site (from `content-extraction-4b1e/0001-data-model-shape`).

## Children

_None — will be marked atomic once questions resolved._

## Open threads

_None yet._

## Considered but rejected

_None._
