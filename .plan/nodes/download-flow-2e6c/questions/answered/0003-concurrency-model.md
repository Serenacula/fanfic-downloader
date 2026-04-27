---
id: 0003-concurrency-model
node: download-flow-2e6c
status: answered
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# How many concurrent downloads, and how is rate limiting handled?

## Answer

**Global chapter request queue.** When a fic download is triggered, all its chapters are enqueued into a single shared queue. Multiple fic downloads run simultaneously — their chapter requests are interleaved in the queue.

- **Max 3 concurrent HTTP requests** in-flight at any time (fixed, not user-configurable).
- **Minimum time between requests** is user-configurable in settings (the existing rate limiting setting).
- **Retry-with-backoff** still applies to individual failed requests (from `content-extraction-4b1e/0004-fetch-error-handling`).
- The popup shows per-fic progress (e.g. "12/50 chapters") regardless of how requests are interleaved.

## Rationale

Queue-based model naturally handles rate limiting across all concurrent downloads without per-fic coordination. Fixed 3-concurrent cap prevents accidental hammering; configurable minimum delay gives the user control over site courtesy.

## Drop / defer reason
