# Plan Status

_Last updated: 2026-04-27_

## Tree

- `root-7f3a` [planning] — 0 open, 2 deferred
  - `fic-downloader-3a8f` [planning]
    - `scaffolding-7c2d` [planning] — decisions recorded; atomic; ready for impl
    - `content-extraction-4b1e` [planning] — all cross-cutting decisions made
      - `data-model-c3f1` [planning] — shape decided; atomic; ready for impl
      - `site-detection-a7b2` [complete, atomic]
      - `dedicated-parsers-e4d9` [planning] — approach decided; atomic per site; ready for impl
      - `forum-parsers-b8c5` [planning] — approach decided; atomic; ready for impl
    - `format-generation-9f5a` [planning] — all decisions made; per-format children atomic
    - `download-flow-2e6c` [planning] — all decisions made
    - `settings-8d4b` [planning] — all settings catalogued; ready for impl

## Open questions across tree

**None.**

## Deferred

- `0004-anti-scrape` (in `root-7f3a`) — Anti-scrape handling. Resolve when attempting Royal Road support.
- `0006-image-handling-txt` (in `root-7f3a`) — Images in TXT format. Resolve when planning format conversion in detail.

## Dropped

- `0001-download-trigger` (in `download-flow-2e6c`) — Superseded by download manager architecture.
