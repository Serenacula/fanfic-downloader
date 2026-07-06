---
id: 0001-data-model-shape
node: content-extraction-4b1e
status: answered
priority: high
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# Should the normalised data model be flat/universal or preserve site-specific shape?

## Context

Every site-specific parser produces a data structure that format generation consumes. The shape of that structure determines how much work format generation does and how much semantic information survives into the output.

## Options (if any)

- **Flat/universal**: All metadata squashed into generic fields (e.g. one `tags` array). Simple renderers, loses meaning.
- **Preserve site shape**: Universal core + structured site-specific metadata section per site. Richer output, per-site branching in renderers.
- **Typed tag taxonomy**: Universal core + typed tags (`kind: "fandom" | "relationship" | ...`). Middle ground.

## Answer

Preserve site shape. The data model has:
- **Universal core**: `title`, `author`, `summary`, `chapters` (list with title + HTML content), `images`, `word_count`, `status`, `published`, `updated`, `source_url`, `series` (name + position)
- **Site-specific metadata**: A structured object whose schema is defined per site (not a free-form bag). Each site's parser defines its own metadata type. Format generation handles each known site's metadata explicitly.

## Rationale

Preserving semantic distinctions (e.g. AO3's fandom/relationship/character/additional tag fields) leads to richer output files that better reflect what the site actually provides. The extra per-site work in format generation is a worthwhile tradeoff.

## Drop / defer reason
