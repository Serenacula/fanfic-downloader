# Sere's Fanfic Downloader

![Screenshot](images/Screenshot%202026-05-01%20at%2018.59.09.png)

A Firefox extension for downloading fanfiction from popular sites in your preferred format.

## Supported Sites

- Archive of Our Own (AO3)
- FanFiction.net (FFN)
- FictionPress
- Royal Road
- Tapas
- ScribbleHub
- Wattpad
- SpaceBattles, Sufficient Velocity, Questionable Questing (XenForo forums)

## Output Formats

EPUB, HTML, Markdown, plain text, PDF, DOCX

## Features

- Configurable output format, filename template, and metadata fields
- Optional cover image, table of contents, and chapter titles
- Embeds downloaded images in the output file
- Preview and edit title/author/tags before downloading

## Installation

Install from [Firefox Addons](https://addons.mozilla.org/en-US/firefox/addon/sere-s-fanfic-downloader/).

## Development

Requirements:

- `node >=20.0.0`
- `npm >=10.0.0`

```bash
npm install
npm run build   # output in dist/
npm run dev     # watch mode
npm test        # run parser tests
```

Load the extension in Firefox: `about:debugging` → "Load Temporary Add-on" → pick any file in `dist/`.

### Keeping fixtures fresh

Some of `src/tests/fixtures/` are real GET dumps of live pages (mapped in
`src/tests/fixtures/sources.json`); the rest are hand-crafted synthetic HTML for sites
whose real content doesn't come from a simple GET (e.g. ScribbleHub's TOC is a POST
endpoint, Wattpad's chapter text comes from a JSON API). Only the ones in
`sources.json` are refreshable:

```bash
npm run refresh-fixtures   # re-fetches every fixture in sources.json
npm test                   # a failure here means a site changed
```

If a test fails after refreshing, the site's markup drifted — fix the parser (or, if
the change is intentional and harmless, update the test's expected values) and commit
the fixture update together with the fix in the same commit.

## License

MIT
