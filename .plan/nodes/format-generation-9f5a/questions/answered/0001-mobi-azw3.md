---
id: 0001-mobi-azw3
node: format-generation-9f5a
status: answered
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# MOBI / AZW3 — generate natively or drop?

## Context

No viable pure-JS MOBI/AZW3 generator exists for browser extension environments. Modern Kindle devices support ePub natively. Keeping it would require a WASM bundled converter.

## Answer

Drop MOBI/AZW3 entirely. No mention in settings, docs, or UI.

## Rationale

ePub covers the Kindle use case on all modern devices. The implementation cost is not justified.

## Drop / defer reason
