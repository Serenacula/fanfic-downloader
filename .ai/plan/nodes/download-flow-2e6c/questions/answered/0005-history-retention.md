---
id: 0005-history-retention
node: download-flow-2e6c
status: answered
priority: low
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# How long are completed/failed downloads kept in the download manager list?

## Context

The download manager popup shows active and recent downloads. "Recent" needs a definition.

## Options (if any)

- **Until popup closed**: list clears on every popup close.
- **Session only**: persists across popup opens but clears when Firefox restarts.
- **Last N entries**: keep the most recent N, persistent across restarts.
- **Until manually cleared**: user has a "clear history" button.

## Answer

Session only. Persists across popup open/close cycles; cleared when Firefox restarts.

## Rationale

Simple and predictable. No unbounded storage growth; no manual clear button needed.

## Drop / defer reason
