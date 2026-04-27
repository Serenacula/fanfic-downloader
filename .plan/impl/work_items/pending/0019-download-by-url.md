---
id: 0019-download-by-url
status: pending
module: download-orchestrator
implements: [download-flow-2e6c]
depends_on: [0018-download-orchestrator, 0008-site-detection]
created: 2026-04-27
started: null
completed: null
---

# Download by URL flow

## What this builds

Extends the orchestrator message API with `startDownloadByUrl(url: string): { jobId: string } | { error: 'unsupported-site' | 'invalid-url' }`. Validates the URL, runs it through site detection, returns an error if unsupported, otherwise enqueues the job.

## Test strategy

Manual: send `startDownloadByUrl('https://archiveofourown.org/works/12345')` via message API, confirm job starts. Send an unsupported URL, confirm `error: 'unsupported-site'` is returned. Send a malformed URL, confirm `error: 'invalid-url'`.

## Notes

This is a thin wrapper over the orchestrator's existing job creation — just adds URL validation and the site detection lookup before calling the same job creation path.
