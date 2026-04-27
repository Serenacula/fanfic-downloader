---
id: 0026-royal-road-parser
status: pending
module: site-parsers
implements: [dedicated-parsers-e4d9]
depends_on: [0002-fic-data-model, 0005-request-queue, 0008-site-detection]
created: 2026-04-27
started: null
completed: null
---

# Royal Road parser

## What this builds

Royal Road fic extractor. Returns `FicData` with `site: 'royalroad'` and `RoyalRoadMetadata` (tags, warnings, genre, followers, rating, etc.).

## Test strategy

Manual integration test against a public Royal Road fic. Verify chapter count, metadata, clean HTML.

## Notes

Blocked on deferred spec question `0004-anti-scrape` — Royal Road has known anti-scrape measures. Investigate at build time; halt if measures prevent clean extraction. Adds `*://*.royalroad.com/*` to manifest host permissions and site detection.
