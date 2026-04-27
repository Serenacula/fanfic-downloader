---
id: 0001-download-trigger
node: download-flow-2e6c
status: dropped
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# Where does the download button appear, and how is download triggered?

## Context

The user needs a way to trigger a download on a fic page.

## Answer

~~Superseded by 0002-download-manager. The "no popup, direct click" approach was replaced when the user identified the need for a download manager to handle multiple concurrent downloads.~~

## Drop / defer reason

Superseded by `0002-download-manager`. Multiple concurrent downloads require a persistent popup UI (download manager), so single-click direct download is no longer the architecture.
