---
id: 0001-extension-scaffold
status: complete
module: scaffolding
implements: [scaffolding-7c2d]
depends_on: []
created: 2026-04-27
started: 2026-04-27
completed: 2026-04-27
---

# Extension scaffold

## What this builds

A loadable Firefox WebExtension skeleton with no application logic. Valid `manifest.json` (MV3), background service worker entry, browser action popup entry (always-popup), options page entry, and a content script entry. Vite build config producing a correctly structured extension zip. The extension loads in Firefox without errors and the popup opens (even if empty).

## Test strategy

Manual: `npm run dev`, load `dist/` as a temporary extension in Firefox (`about:debugging`), confirm no manifest errors, popup opens on icon click, options page opens via extension settings.

## Notes

Permissions to declare upfront: `downloads`, `activeTab`, `storage`, `scripting`. Host permissions: `*://*.archiveofourown.org/*`, `*://*.fanfiction.net/*`. Content script match patterns for those two domains. Additional domains added as parsers are built (work items 0006–0007 will flag what to add).
