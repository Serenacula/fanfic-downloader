---
id: 0008-site-detection
status: complete
module: site-parsers
implements: [site-detection-a7b2]
depends_on: [0006-ao3-parser, 0007-ffn-parser]
created: 2026-04-27
started: 2026-04-27
completed: 2026-04-27
---

# Site detection

## What this builds

`detectParser(url: string): Parser | null` — maps a URL to the correct parser module or returns null for unsupported sites. Also exports `isFicPage(url: string): boolean` used by the popup to determine whether to enable the "Download" button.

## Test strategy

Unit tests: confirm AO3 work URLs, AO3 chapter URLs, FFN story URLs each return the correct parser. Confirm a random URL returns null.

## Notes

Implemented as a simple array of `{ pattern: RegExp, parser: Parser }` entries. Patterns: AO3 — `/archiveofourown\.org\/works\/\d+/`, FFN — `/fanfiction\.net\/s\/\d+/`. New parsers add entries here. `isFicPage` is a thin wrapper over `detectParser`.
