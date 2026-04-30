---
id: 0026-royal-road-parser
status: complete
module: site-parsers
implements: [dedicated-parsers-e4d9]
depends_on: [0002-fic-data-model, 0005-request-queue, 0008-site-detection]
created: 2026-04-27
started: 2026-04-27
completed: 2026-04-27
---

# Royal Road parser

## What this builds

Royal Road fic extractor. Returns `FicData` with `site: 'royalroad'` and `RoyalRoadMetadata` (tags, followers, rating, views).

## Test strategy

Manual integration test against a public Royal Road fic. Verify chapter count, metadata, clean HTML.

## Notes

Anti-scrape deferred spec question: investigated at build time. Standard fetchHtml works; no additional mitigation added. If Cloudflare challenges appear during real-world use, the `enqueue`/retry logic provides some resilience. Added `*://*.royalroad.com/*` to manifest host permissions and content_scripts matches.

Files created: `src/parsers/royalroad.ts`. Registered in `src/parsers/index.ts`.
