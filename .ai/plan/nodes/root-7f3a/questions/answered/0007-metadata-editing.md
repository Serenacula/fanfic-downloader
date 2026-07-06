---
id: 0007-metadata-editing
node: root-7f3a
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# What kind of fic metadata editing, if any, is in scope?

## Context

"Metadata editing" covers a wide range. At one end: letting the user tweak the title or author name before download (lightweight, useful when a site has a messy title). At the other end: a full post-download metadata editor for the generated ePub/DOCX.

## Options (if any)

- **None**: Metadata is fetched from the site as-is, no editing. Out of scope.
- **Pre-download field overrides**: A small form before download lets the user override specific fields (title, author, series) before the file is generated.
- **Post-download ePub metadata editing**: Edit embedded ePub metadata after the file already exists. Significantly more complex.
- **Tag/category filtering**: Choose which tags or categories to include in the story info section (distinct from full metadata editing).

## Answer

A **pre-download confirmation dialogue**, togglable in settings:
- **Disabled** (default or opt-in TBD): download proceeds immediately, no confirmation step.
- **Enabled**: before download, user sees a form and can adjust metadata fields before the file is generated.

Fields include at minimum: title, author, series, summary. Other story info fields to be decided when planning the settings/story-info node.

Post-download ePub editing: explicitly out of scope.

## Rationale

User wanted a lightweight, optional pre-download step rather than a full metadata editor. Making it a settings toggle respects users who want fast one-click downloads.

## Drop / defer reason
