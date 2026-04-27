---
id: 0005-request-queue
status: complete
module: request-queue
implements: [content-extraction-4b1e]
depends_on: [0003-settings-schema]
created: 2026-04-27
started: 2026-04-27
completed: 2026-04-27
---

# Request queue

## What this builds

The global HTTP request queue singleton used by all parsers. Enforces: max 3 concurrent in-flight requests, minimum delay between dispatches (read from settings at dispatch time), exponential backoff on 4xx/5xx/network error with up to 3 retries before rejecting.

## Test strategy

Unit tests (vitest): (1) confirm max 3 requests fire simultaneously when 10 are enqueued, (2) confirm a failing request is retried up to 3 times before rejecting, (3) confirm the queue respects minimum delay between request starts, (4) confirm a successful request resolves with the response.

## Notes

The queue lives in the background SW (not in content scripts). Parsers import and call it. Reads `settings.rateLimitMs` at dispatch time so live changes take effect. Retry uses delays of `retryCount * 1000ms` (1s, 2s, 3s).
