# Sere's Fic Downloader

`VERSION: 1.0.0`

A Firefox extension for downloading fan fiction from popular sites in your preferred format.

## Supported Sites

- Archive of Our Own (AO3)
- FanFiction.net (FFN)
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

Coming soon on [Firefox Add-ons (AMO)](https://addons.mozilla.org).

## Development

```bash
npm install
npm run build   # output in dist/
npm run dev     # watch mode
npm test        # run parser tests
```

Load the extension in Firefox: `about:debugging` → "Load Temporary Add-on" → pick any file in `dist/`.

## License

MIT
