---
id: 0004-fetch-error-handling
node: content-extraction-4b1e
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# What happens when a chapter fetch fails mid-download?

## Context

On a long fic, a transient network error or rate-limit response mid-way through fetching chapters needs a defined behaviour.

## Options (if any)

- Abort and report
- Retry with backoff, then abort
- Partial download with gap marker
- Pause and prompt

## Answer

Retry with backoff. If all retries are exhausted, abort the download and report a clear error to the user identifying which chapter failed and why.

## Rationale

Handles transient failures (network blips, brief rate limiting) silently without user intervention. Still fails clearly when the problem is persistent, so the user knows what happened.

## Drop / defer reason
