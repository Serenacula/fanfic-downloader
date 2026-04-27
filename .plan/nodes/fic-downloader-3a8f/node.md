---
id: fic-downloader-3a8f
parent: root-7f3a
slug: fic-downloader
status: planning
atomic: false
depends_on: []
created: 2026-04-27
updated: 2026-04-27
---

# fic-downloader (plugin)

## Purpose

The basic Firefox plugin. Detects fic pages, lets users trigger a download, extracts content, converts to the chosen format, and saves the file. Published on AMO.

## Scope

**In scope:**
- Manual download triggered by the user on a fic page
- Site support: AO3, FFN (initial); full feature-complete site list per root decisions
- All 8 output formats
- Pre-download confirmation dialogue (togglable)
- Settings page
- Images (with disable toggle)
- Story info text (with field configuration)

**Out of scope:**
- Automation / auto-download (fic-downloader-expanded)
- Native host / custom folder (fic-downloader-expanded)
- In-browser reader, cloud sync, cross-browser, translation

## Decisions

_Inherited from root — see root-7f3a decisions._

## Children

- `scaffolding-7c2d` — Manifest, permissions, build tooling, AMO compliance
- `content-extraction-4b1e` — Site-specific parsers; extracts fic content and metadata
- `format-generation-9f5a` — Converts extracted content to each output format
- `download-flow-2e6c` — User-facing download interaction: button, popup, confirmation dialogue, file save
- `settings-8d4b` — Options page and preference storage

## Open threads

_None yet — children not yet planned._

## Considered but rejected

_None._

## Notes

_Planning this plugin first; fic-downloader-expanded is a separate future planning session._
