---
id: 0027-remaining-site-parsers
status: complete
module: site-parsers
implements: [dedicated-parsers-e4d9, forum-parsers-b8c5]
depends_on: [0002-fic-data-model, 0005-request-queue, 0008-site-detection]
created: 2026-04-27
started: 2026-04-27
completed: 2026-04-27
---

# Remaining feature-complete site parsers

## What this builds

Individual parsers for Tapas, ScribbleHub, Wattpad, SpaceBattles, SufficientVelocity, and QuestionableQuesting.

## Test strategy

Per-parser manual integration test against a public fic on each site.

## Notes

Tapas: scrapes series info page + per-episode pages. Extracts `TapasMetadata` (genre, status).
ScribbleHub: uses WordPress AJAX `wi_getreleases_long` endpoint for chapter list; `enqueue` is called with POST options. Extracts `ScribbleHubMetadata` (tags, genres, rating, views, favorites).
Wattpad: tries v3 API (`/api/v3/stories/{id}`) for metadata and chapter text, with HTML scrape fallback. Extracts `WattpadMetadata` (genre, reads, votes).
XenForo (SB/SV/QQ): shared `createXenForoParser()` factory in `xenforo.ts` fetches threadmarks page and each post by anchor. The three site parsers are thin exports from that file. Extracts site-specific metadata (threadUrl, subForum).

All parsers wired into `src/parsers/index.ts`. Host permissions and content_script matches added to `manifest.json` for all six sites.

Files created: `src/parsers/tapas.ts`, `src/parsers/scribblehub.ts`, `src/parsers/wattpad.ts`, `src/parsers/xenforo.ts`.
