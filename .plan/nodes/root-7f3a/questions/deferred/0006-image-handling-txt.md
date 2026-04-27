---
id: 0006-image-handling-txt
node: root-7f3a
status: deferred
priority: low
blocks: []
blocked_by: []
created: 2026-04-27
resolved: null
---

# How should images be handled when the output format is TXT?

## Context

TXT format has no mechanism for embedding or referencing images. Options range from silently dropping them to substituting alt text or image URLs. The user wants images included in downloads generally, with a global setting to disable them — but TXT is a special case regardless of that setting.

## Options (if any)

- **Drop silently**: Images are omitted; no indication in the output.
- **Substitute alt text**: Insert the image's alt text (or a placeholder like `[image]`) where the image would appear.
- **Insert image URL**: Insert the source URL so the reader can find it if they want.
- **Warn the user**: Show a notice at download time that TXT cannot include images.

## Answer

## Rationale

## Drop / defer reason

Deferred: user explicitly asked to defer this. Resolve when planning the format conversion node in detail.
