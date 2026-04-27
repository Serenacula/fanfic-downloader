---
id: site-detection-a7b2
parent: content-extraction-4b1e
slug: site-detection
status: complete
atomic: true
depends_on: []
created: 2026-04-27
updated: 2026-04-27
---

# Site Detection

## Purpose

Determines which parser to activate for a given page. In a Firefox WebExtension, content scripts are registered with URL match patterns in the manifest — so detection is inherently URL-based and handled by the browser runtime, not custom code.

## Scope

**In scope:**
- URL match patterns in `manifest.json` for each supported site
- Mapping from site → parser module (for the background script's fetch-based extraction)

**Out of scope:**
- Parser logic itself (dedicated-parsers, forum-parsers)

## Decisions

- **Approach**: URL pattern matching via manifest content_scripts declarations. No custom detection logic needed — the browser handles it.

## Children

_None — atomic._

## Open threads

_None._

## Considered but rejected

_None._
