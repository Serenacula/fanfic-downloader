---
id: 0003-image-handling
node: content-extraction-4b1e
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# When and how do we fetch images?

## Context

Inline images in fic content are URL references. We need to decide when to fetch them and which ones to fetch.

## Answer

**When:** During extraction, gated on the images setting. If images are disabled in settings, skip image fetching entirely — no wasted downloads. If enabled, fetch and attach images as part of the extraction pass so format generation receives a self-contained package.

**How:** Site-dependent — do what's sensible per site. Generally fetch from the fic host's own image CDN. External images (Imgur, etc.) handled on a per-site basis depending on how that site typically stores author-uploaded images.

## Rationale

User correctly noted extraction already has access to settings, so there's no reason to fetch eagerly when images are disabled. The "how" depends on site behaviour — no one-size-fits-all rule.

## Drop / defer reason
