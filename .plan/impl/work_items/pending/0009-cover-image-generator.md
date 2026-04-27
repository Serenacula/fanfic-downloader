---
id: 0009-cover-image-generator
status: pending
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0002-fic-data-model]
created: 2026-04-27
started: null
completed: null
---

# Cover image generator

## What this builds

`generateCoverImage(title: string, author: string): Promise<Blob>` — produces a PNG title card (600×900px) with title and author text on a plain background, suitable for use as an ePub cover or embedded image in other formats.

## Test strategy

Manual: call `generateCoverImage('Test Title', 'Test Author')` in the SW console, confirm a Blob is returned. Download and open it as an image to verify it looks correct.

## Notes

Use `OffscreenCanvas` (available in service workers). Simple design: solid background colour, centred title in large font, author below in smaller font. No external font loading — use system fonts via canvas. Output as PNG Blob.
