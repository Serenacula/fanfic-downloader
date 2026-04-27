---
id: 0022-confirmation-screen
status: pending
module: download-manager-ui
implements: [download-flow-2e6c]
depends_on: [0020-popup-shell, 0003-settings-schema]
created: 2026-04-27
started: null
completed: null
---

# Confirmation screen

## What this builds

The pre-download confirmation form screen (shown when the `confirmationDialogue` setting is enabled). Prefilled editable fields: title, author, series, summary. "Download" submit button that passes the overrides to the orchestrator. "Cancel" to dismiss. Only shown when the setting is on; the download list screen bypasses it when off.

## Test strategy

Manual: enable confirmation dialogue in settings, click "Download" on a fic page, confirm the form appears prefilled with correct values. Edit the title, click Download, confirm the downloaded file uses the edited title. Confirm the screen does not appear when the setting is off.

## Notes

Field values come from the FicData returned by a metadata-only parse pass (fetch and parse fic metadata without fetching all chapters). The orchestrator needs a `fetchMetadata(url)` call for this pre-download preview — a lightweight variant of the full parse. The overrides object is passed through to the job and applied before rendering.
