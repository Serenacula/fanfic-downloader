---
id: 0002-chapter-fetching
node: content-extraction-4b1e
status: answered
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# How do we fetch all chapters of a multi-chapter fic?

## Context

Sites handle multi-chapter content differently. The question is whether to use the DOM for the current page or always fetch fresh.

## Options (if any)

- **DOM-first, fetch for the rest**: Read current page from DOM, fetch remaining chapters via HTTP.
- **Always re-fetch everything**: Ignore the DOM, always fetch all content fresh.
- **DOM-only**: Only download what's visible — one chapter at a time.

## Answer

Always fetch — ignore the DOM and fetch all chapters fresh via HTTP, including the one the user is currently on. Combined with configurable rate limiting.

## Rationale

DOM-first saves at most one request out of potentially many, adds two code paths (DOM extraction vs HTTP extraction), and risks serving stale content. Since rate limiting is needed anyway for the bulk fetches, always-fetch with rate limiting is simpler and more consistent. AO3's entire-work page can be treated as a site-specific optimisation if wanted later.

## Drop / defer reason
