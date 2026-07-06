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

- `fanfic-downloader/` Firefox plugin — manual downloads from AO3, FFN, RoyalRoads, Tapas, and similar sites
- `fanfic-downloader-expanded/` Firefox plugin — automated downloads (on bookmark, kudos, view), custom folder routing, native host integration
- `shared/` — opportunistic shared code between the two plugins
- Rust native messaging host for filesystem access beyond Firefox sandboxing
- README.md and GitHub repository setup

**Out of scope:**

- TBD (question 0003)

## Decisions

- **Audience** (from `0001-audience`): Public release — both plugins will be published to AMO. Implies polished UX, user-facing errors, AMO-compliant permissions, and clean native host install experience.
- **Success criteria** (from `0002-success-criteria`): Initial = AO3 + FFN, ePub. Feature complete = 9 sites (AO3/FFN/RR/Tapas/SH/Wattpad/SB/SV/QQ), 6 formats (ePub/PDF/HTML/Markdown/DOCX/TXT). Site list may flex based on anti-scrape difficulty.
- **Out of scope** (from `0003-out-of-scope`): In-browser reader, cloud sync, chapter-level downloads, cross-browser, translation (all hard no). Calibre integration and translation possibly in scope for expanded plugin.
- **Images in scope** (from `0003-out-of-scope`): Images included by default; settings option to disable. TXT handling deferred (question `0006`).
- **Story info in scope** (from `0003-out-of-scope`): Story info included; settings option to configure which fields are shown.
- **Pre-download confirmation dialogue** (from `0007-metadata-editing`): Optional, togglable in settings. When enabled, shows a form before download so user can adjust title, author, series, summary. When disabled, download proceeds immediately. Post-download ePub editing is out of scope.
- **Forum-based sites: first-class** (from `0005-forum-sites`): SB, SV, QQ treated as first-class. Extraction approach uses threadmarks (story post index) and read mode (main-posts-only view) — clean enough to match dedicated sites.
- **Platform**: Firefox WebExtension API — stated by user as the target platform.
- **Native client language**: Rust — chosen by user for the native messaging host.
- **Sharing model**: Opportunistic (`shared/` folder), not a design constraint — user stated this explicitly.

## Children

- `fanfic-downloader-3a8f` — The basic fanfic-downloader Firefox plugin (planning in progress)
- `fanfic-downloader-expanded` — Future planning session; not in scope now.

## Open threads

_None — all root questions answered or deferred._

## Considered but rejected

- **In-browser reader**: Out of scope — not the goal of a downloader.
- **Cloud sync**: Out of scope — no plans.
- **Chapter-level granular downloads**: Out of scope.
- **Cross-browser support**: Out of scope — Firefox only.
- **Translation**: Out of scope for basic; maybe for expanded.

## Notes

- GitHub repo: https://github.com/Serenacula/fanfic-downloader
- **Planning scope**: This planning session covers `fanfic-downloader` only. `fanfic-downloader-expanded` is noted for future planning.
- The expanded plugin is partially independent of Firefox (the Rust native host runs outside the browser).
- **Planned future project**: `fanfic-downloader-cli` — a CLI tool that downloads fics to a chosen folder, defaulting to the current directory. Noted in README. Not part of this planning session.
