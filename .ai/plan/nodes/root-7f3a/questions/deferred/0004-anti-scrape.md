---
id: 0004-anti-scrape
node: root-7f3a
status: deferred
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: null
---

# How do we handle sites with anti-scrape measures?

## Context

Royal Road and potentially others implement measures against automated scraping (rate limiting, CAPTCHAs, JS-rendered content, etc.). Since the plugin runs in the browser as the logged-in user, some of these are less of an issue — but it still shapes the approach (e.g. whether we use the DOM directly vs. fetch, whether we need delays, whether we can support rate-limited bulk downloads).

## Options (if any)

- **DOM-based extraction**: Read content from the already-rendered page the user is viewing — bypasses most scraping restrictions since the browser already fetched it legitimately.
- **Fetch-based extraction**: Make additional HTTP requests from the extension — may trip rate limits or be blocked.
- **Hybrid**: Use DOM for current page, fetch for additional chapters, with user-configurable delays.

## Answer

## Rationale

## Drop / defer reason

Deferred: user acknowledged this is an unknown. Resolve once we attempt Royal Road support and can assess what measures are actually in place.
