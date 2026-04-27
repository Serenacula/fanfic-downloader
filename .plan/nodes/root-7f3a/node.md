---
id: root-7f3a
parent: null
slug: root
status: planning
atomic: false
depends_on: []
created: 2026-04-27
updated: 2026-04-27


---

# Root — Fic Downloader Suite

## Purpose

Top-level node covering the full project: two Firefox WebExtension plugins and a Rust native host client, housed in a single repository.

## Scope

**In scope:**
- `fic-downloader/` Firefox plugin — manual downloads from AO3, FFN, RoyalRoads, Tapas, and similar sites
- `fic-downloader-expanded/` Firefox plugin — automated downloads (on bookmark, kudos, view), custom folder routing, native host integration
- `shared/` — opportunistic shared code between the two plugins
- Rust native messaging host for filesystem access beyond Firefox sandboxing
- README.md and GitHub repository setup

**Out of scope:**
- TBD (question 0003)

## Decisions

- **Audience** (from `0001-audience`): Public release — both plugins will be published to AMO. Implies polished UX, user-facing errors, AMO-compliant permissions, and clean native host install experience.
- **Platform**: Firefox WebExtension API — stated by user as the target platform.
- **Native client language**: Rust — chosen by user for the native messaging host.
- **Sharing model**: Opportunistic (`shared/` folder), not a design constraint — user stated this explicitly.

## Children

_None yet — awaiting decomposition after root questions answered._

## Open threads

- `0001-audience`
- `0002-success-criteria`
- `0003-out-of-scope`

## Considered but rejected

_None yet._

## Notes

- GitHub init and README.md are explicitly required before any implementation work begins.
- The expanded plugin is partially independent of Firefox (the Rust native host runs outside the browser).
