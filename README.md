# Sere's Fanfic Downloader

`VERSION: 1.0.0`

A Firefox extension for downloading fanfiction from popular sites in your preferred format.

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

Requirements:

- `node >=20.0.0`
- `npm >=10.0.0`

```bash
npm install
npm run build   # output in dist/
npm run dev     # watch mode
npm test        # run parser tests
```

If you're not on macOS, you'll need to:

- Change build line in package.json to `"build": "vite build"`
- Run the npm commands above
- Manually zip the contents of the `dist/` folder
- Rename the zip file to `.xpi` extension

Load the extension in Firefox: `about:debugging` → "Load Temporary Add-on" → pick any file in `dist/`.

## License

MIT
