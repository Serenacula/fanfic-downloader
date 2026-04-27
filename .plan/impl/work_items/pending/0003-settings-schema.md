---
id: 0003-settings-schema
status: pending
module: settings
implements: [settings-8d4b]
depends_on: [0002-fic-data-model]
created: 2026-04-27
started: null
completed: null
---

# Settings schema and storage helpers

## What this builds

The `Settings` TypeScript type (completing the stub from 0002), all default values, and typed `getSettings()` / `saveSettings()` helpers over `browser.storage.local`. No UI — just the data layer.

## Test strategy

Manual: from the browser console in the extension context, call `getSettings()` and confirm defaults are returned. Call `saveSettings({ format: 'pdf' })`, reload, call `getSettings()`, confirm the value persisted.

## Notes

Settings keys per spec: `format` (default: `'epub'`), `includeImages` (true), `includeCoverImage` (true), `includeCoverPage` (true), `includeToc` (true), `includeAuthorNotes` (false), `chapterSplit` (false), `includeChapterTitles` (true), `confirmationDialogue` (false), `rateLimitMs` (500), `filenameTemplate` (`'{title} - {author}'`), `storyInfoFields` (per-site object with sensible defaults). Version field for future migrations.
