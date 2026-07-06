---
id: 0002-storage-backend
node: settings-8d4b
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# Should settings sync across devices (storage.sync) or stay local (storage.local)?

## Answer

`browser.storage.local`. Settings are device-specific.

## Rationale

Folder structures in fanfic-downloader-expanded would differ per device, making sync actively wrong there. For consistency between the two plugins (and because a potential future merge is being considered), both use local storage. None of the current settings have a compelling cross-device use case that outweighs the consistency argument.

## Drop / defer reason
