---
id: 0013-markdown-renderer
status: complete
module: format-renderers
implements: [format-generation-9f5a]
depends_on: [0010-story-info-page]
created: 2026-04-27
started: 2026-04-28
completed: 2026-04-28
---

# Markdown renderer

## What this builds

`renderMarkdown(data: FicData, settings: Settings): Promise<Blob>` — single `.md` file or zip of per-chapter `.md` files. Story info as YAML frontmatter. HTML chapter content converted to Markdown.

## Test strategy

Manual: download a fic as Markdown, open in a Markdown viewer (VS Code, Obsidian), verify formatting is correct, frontmatter is valid YAML, images handled appropriately (deferred — no URLs for now).

## Notes

HTML-to-Markdown conversion handles: `<p>` → paragraph, `<em>` → `*`, `<strong>` → `**`, `<hr>` → `---`, `<blockquote>` → `>`, `<a>` → `[text](url)`, `<h1>`–`<h3>` → `#`–`###`. No library needed for this limited subset. Images: since TXT image handling is deferred, Markdown images are also deferred — `<img>` tags stripped for now.
