---
id: forum-parsers-b8c5
parent: content-extraction-4b1e
slug: forum-parsers
status: planning
atomic: false
depends_on: [data-model-c3f1]
created: 2026-04-27
updated: 2026-04-27
---

# Forum Site Parsers

## Purpose

Extraction logic for forum-based fic sites: SpaceBattles, Sufficient Velocity, QuestionableQuesting. All three support threadmarks (structured story post index) and a read mode (main-posts-only view), which provide a clean extraction path.

## Scope

**In scope:**
- SpaceBattles parser
- Sufficient Velocity parser
- QuestionableQuesting parser
- Threadmark index discovery and traversal
- Per-post fetch and content extraction (filtering out quotes, post metadata, etc.)
- Author identification (to distinguish story posts from replies, if needed)

**Out of scope:**
- Raw thread parsing (not needed given threadmarks/read mode)
- Dedicated site parsers (dedicated-parsers)

## Decisions

- **Extraction approach**: Threadmarks + read mode, not raw thread parsing (from root `0005-forum-sites`).
- **Quality target**: First-class, same standard as dedicated sites (from root `0005-forum-sites`).
- **Fetch strategy**: Always fetch fresh, with configurable rate limiting and retry-with-backoff (inherited from `content-extraction-4b1e`).

## Children

_None yet._

## Open threads

_None yet._

## Considered but rejected

_None._
