---
id: 0001-settings-page-location
node: settings-8d4b
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# Where does the settings page open?

## Answer

Full tab, via `browser.runtime.openOptionsPage()`. The popup slot is already used by the download manager.

## Rationale

User confirmed. Only viable option given the popup is taken.

## Drop / defer reason
