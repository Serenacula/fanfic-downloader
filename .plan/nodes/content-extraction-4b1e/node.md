---
id: content-extraction-4b1e
parent: fic-downloader-3a8f
slug: content-extraction
status: planning
atomic: false
depends_on: [scaffolding-7c2d]
created: 2026-04-27
updated: 2026-04-27
---

# Content Extraction

## Purpose

Site-specific parsers that extract structured fic data from a page: title, author, summary, chapter list, chapter content, images, tags, and other story info. Produces a normalised internal representation that format-generation consumes.

## Scope

**In scope:**
- Normalised internal fic data model (the shape that all parsers must produce)
- Per-site parsers: AO3, FFN (initial); RR, Tapas, SH, Wattpad, SB, SV, QQ (feature-complete)
- Multi-chapter navigation (fetching all chapters, not just the current page)
- Image extraction and inline reference
- Forum site extraction via threadmarks / read mode (SB, SV, QQ)
- Site detection (which parser to activate on a given page)

**Out of scope:**
- Format conversion (format-generation)
- Anti-scrape handling strategy (deferred, question 0004)

## Decisions

- **Forum sites**: Use threadmarks + read mode for extraction, not raw thread parsing (from root `0005-forum-sites`).
- **Data model shape** (from `0001-data-model-shape`): Universal core (title, author, summary, chapters, images, word_count, status, dates, source_url, series) + structured site-specific metadata section with a defined schema per site. Format generation handles each site's metadata explicitly.
- **Chapter fetching** (from `0002-chapter-fetching`): Always fetch all chapters fresh via HTTP (ignore DOM). Configurable rate limiting between requests.
- **Image fetching** (from `0003-image-handling`): During extraction, gated on images setting — if disabled, skip entirely. How to fetch is site-dependent (use what makes sense per site).
- **Fetch error handling** (from `0004-fetch-error-handling`): Retry with exponential backoff. If retries exhausted, abort and report a clear error identifying which chapter failed.

## Children

- `data-model-c3f1` — TypeScript types for the normalised fic structure
- `site-detection-a7b2` — URL pattern matching → parser selection (atomic)
- `dedicated-parsers-e4d9` — AO3, FFN, Royal Road, Tapas, Scribble Hub, Wattpad
- `forum-parsers-b8c5` — SpaceBattles, Sufficient Velocity, QuestionableQuesting

## Open threads

_None yet._

## Considered but rejected

_None._

## Notes

_The normalised data model is a critical design decision — format-generation depends on it entirely._
