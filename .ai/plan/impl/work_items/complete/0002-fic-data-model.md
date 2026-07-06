---
id: 0002-fic-data-model
status: complete
module: shared-types
implements: [data-model-c3f1]
depends_on: [0001-extension-scaffold]
created: 2026-04-27
started: 2026-04-27
completed: 2026-04-27
---

# Fic data model types

## What this builds

All TypeScript interfaces for the normalised fic data structure: `FicChapter`, `FicImage`, `FicCore`, `AO3Metadata`, `FFNMetadata`, the `FicData` discriminated union, and the `RendererFn` interface. These are the contracts every parser and renderer must satisfy.

## Test strategy

Type-check only: `tsc --noEmit` passes with no errors. No runtime tests — this is purely types.

## Notes

`FicData` is a discriminated union: `{ site: 'ao3', core: FicCore, meta: AO3Metadata } | { site: 'ffn', core: FicCore, meta: FFNMetadata } | ...`. This lets renderers do exhaustive type-narrowing per site. `RendererFn = (data: FicData, settings: Settings) => Promise<Blob>` — the Settings type is stubbed here and filled out in the settings module (0003).
