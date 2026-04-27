---
id: 0007-ffn-parser
status: pending
module: site-parsers
implements: [dedicated-parsers-e4d9, data-model-c3f1]
depends_on: [0002-fic-data-model, 0005-request-queue, 0003-settings-schema]
created: 2026-04-27
started: null
completed: null
---

# FFN parser

## What this builds

Full FanFiction.net fic extractor. Given an FFN fic URL, fetches all chapters via the request queue and extracts: title, author, summary, fandoms, genre tags, characters, word count, status, published, updated, chapter list, chapter content (HTML, sanitised), inline images. Returns `FicData` with `site: 'ffn'` and `FFNMetadata`.

## Test strategy

Manual integration test against a real FFN fic: call `ffnParser.parse(url, settings)`, inspect `FicData`. Verify chapter count, title/author, genre/character fields, clean HTML.

## Notes

FFN chapter URLs follow the pattern `https://www.fanfiction.net/s/{storyId}/{chapterNum}/`. Chapter count and metadata can be extracted from any chapter page's `#storytext` + story metadata bar. FFN does not have a "view all chapters" URL — must fetch each chapter individually. Chapter selection dropdown gives the full chapter list. No author notes on FFN.
