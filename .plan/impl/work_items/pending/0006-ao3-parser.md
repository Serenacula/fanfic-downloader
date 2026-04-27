---
id: 0006-ao3-parser
status: pending
module: site-parsers
implements: [dedicated-parsers-e4d9, data-model-c3f1]
depends_on: [0002-fic-data-model, 0005-request-queue, 0003-settings-schema]
created: 2026-04-27
started: null
completed: null
---

# AO3 parser

## What this builds

Full AO3 fic extractor. Given an AO3 fic URL (work or chapter), determines the canonical "entire work" URL, fetches all chapters via the request queue, extracts: title, author, summary, fandom(s), relationships, characters, additional tags, warnings, rating, categories, word count, status, published, updated, series (name + position), chapter list, chapter content (HTML, sanitised), author notes per chapter, inline images (if enabled). Returns `FicData` with `site: 'ao3'` and fully typed `AO3Metadata`.

## Test strategy

Manual integration test against a real AO3 fic (a short public work): call `ao3Parser.parse(url, settings)`, inspect the returned `FicData` object in the SW console. Verify: chapter count matches site, title/author correct, fandom/tags present in metadata, chapter HTML is clean (no script tags, no AO3 chrome). Test with images enabled and disabled.

## Notes

AO3 requires the `?view_adult=true` query param to bypass content warnings without a login. The "entire work" URL is `https://archiveofourown.org/works/{id}?view_full_work=true`. HTML sanitisation: strip all `<script>`, `<iframe>`, `<form>`, on* attributes, external stylesheet links. Preserve: `<p>`, `<em>`, `<strong>`, `<br>`, `<hr>`, `<blockquote>`, `<img>`, `<a>`, headings.
