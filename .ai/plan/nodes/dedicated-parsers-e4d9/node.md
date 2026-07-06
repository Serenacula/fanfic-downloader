---
id: dedicated-parsers-e4d9
parent: content-extraction-4b1e
slug: dedicated-parsers
status: planning
atomic: false
depends_on: [data-model-c3f1]
created: 2026-04-27
updated: 2026-04-27
---

# Dedicated Site Parsers

## Purpose

Site-specific extraction logic for standard fic-hosting sites: AO3, FFN, Royal Road, Tapas, Scribble Hub, Wattpad. Each parser fetches and parses all chapters, images (if enabled), and site-specific metadata, producing the normalised fic data model.

## Scope

**In scope:**
- AO3 parser (initial version)
- FFN parser (initial version)
- Royal Road parser (feature-complete)
- Tapas parser — novels only (feature-complete)
- Scribble Hub parser (feature-complete)
- Wattpad parser (feature-complete)
- Each parser: chapter list discovery, per-chapter fetch + parse, metadata extraction, image extraction

**Out of scope:**
- Forum-based sites (forum-parsers)
- Anti-scrape handling strategy (deferred, root `0004-anti-scrape`)

## Decisions

- **Fetch strategy**: Always fetch fresh, with configurable rate limiting and retry-with-backoff (from `content-extraction-4b1e`).
- **Image fetching**: Gated on images setting; site-dependent approach (from `content-extraction-4b1e`).

## Children

_None yet — may decompose per parser if per-site questions are significant._

## Open threads

_None yet._

## Considered but rejected

_None._

## Notes

_Royal Road has known anti-scrape measures — defer specifics to question `0004-anti-scrape` at root._
