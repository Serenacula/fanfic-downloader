---
id: 0027-remaining-site-parsers
status: pending
module: site-parsers
implements: [dedicated-parsers-e4d9, forum-parsers-b8c5]
depends_on: [0002-fic-data-model, 0005-request-queue, 0008-site-detection]
created: 2026-04-27
started: null
completed: null
---

# Remaining feature-complete site parsers

## What this builds

Individual parsers for: Tapas (novels), Scribble Hub, Wattpad, SpaceBattles (threadmarks), Sufficient Velocity (threadmarks), QuestionableQuesting (threadmarks). Each follows the same pattern as AO3/FFN: returns typed `FicData` with site-specific metadata, integrates with site detection.

## Test strategy

Per-parser manual integration test against a public fic on each site.

## Notes

This work item will be split into one item per site at build time — grouped here for planning purposes. Forum parsers (SB/SV/QQ) use the threadmarks API + read mode URLs; Tapas/SH/Wattpad are standard paginated chapter sites. Add host permissions and site detection entries per site.
