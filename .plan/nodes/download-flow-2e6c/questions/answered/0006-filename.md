---
id: 0006-filename
node: download-flow-2e6c
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# What is the filename for downloaded files?

## Answer

User-configurable filename template. Default: `{title} - {author}`.

Supported keywords: `{title}`, `{author}`, `{currentDate}`, `{publishDate}`, `{updateDate}`.

Extension (`.epub`, `.pdf`, etc.) is appended automatically from the selected format — not part of the template. Configured in the settings page via a string editor with keyword reference.

## Rationale

User wants configurability. Fixed default covers the common case; keywords cover sorting and disambiguation needs.

## Drop / defer reason
