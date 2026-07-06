---
id: scaffolding-7c2d
parent: fanfic-downloader-3a8f
slug: scaffolding
status: planning
atomic: false
depends_on: []
created: 2026-04-27
updated: 2026-04-27
---

# Extension Scaffolding

## Purpose

Everything that makes the plugin a valid, installable Firefox WebExtension: manifest, declared permissions, content script injection rules, background service worker, build tooling, and AMO submission requirements.

## Scope

**In scope:**

- `manifest.json` (Manifest V3) — extension metadata, permissions, content script patterns
- Background service worker / background script
- Content script injection strategy (which pages, when)
- Build toolchain (bundler, dev mode, packaging for AMO)
- AMO compliance: no remote code execution, permission justifications, privacy policy stub

**Out of scope:**

- Actual content script logic (content-extraction, download-flow)
- UI implementation (download-flow, settings)

## Decisions

- **Language**: TypeScript throughout.
- **Build tool**: Vite with the `@samrum/vite-plugin-web-extension` plugin (or equivalent). Dev mode with hot reload; production build zipped for AMO submission.
- **Manifest version**: V3 (Firefox current standard).
- **Permissions**: `downloads`, `activeTab`, `storage`, `scripting` (for toast injection), plus host permissions for each supported site.

## Children

_None yet._

## Open threads

_None yet._

## Considered but rejected

_None._

## Notes

_Firefox uses Manifest V3. AMO review requires all permissions to be justified and no use of eval or remote code._
