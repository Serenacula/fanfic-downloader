---
id: 0004-settings-page-ui
status: pending
module: settings
implements: [settings-8d4b]
depends_on: [0003-settings-schema]
created: 2026-04-27
started: null
completed: null
---

# Settings page UI

## What this builds

The full options page (full tab): all toggles, format selector, filename template editor with keyword reference, rate limit input, story info field configuration, and "Reset to defaults" button. Reads and writes via the settings helpers from 0003.

## Test strategy

Manual: open the options page, change format to PDF, reload the page, confirm PDF is still selected. Toggle "Include images" off, reload, confirm it persisted. Click "Reset to defaults", confirm all values return to defaults. Verify the chapter-split option is greyed out when ePub is selected, with helper text.

## Notes

No framework requirement — vanilla HTML/CSS/TS is fine for a settings page. Filename template editor should show a reference list of available keywords (`{title}`, `{author}`, `{currentDate}`, `{publishDate}`, `{updateDate}`) below the input.
