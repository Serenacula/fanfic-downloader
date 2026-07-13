# Durable AI operating rules for this repo

These rules are standing and apply across all tasks/sessions in this repo, not just
one worklog entry. Read this file if it exists, alongside whatever task-specific state
(`.ai/worklog/`, `.ai/plan/`, `.ai/bugloop/`) is active.

## Never push

AI must never run `git push` (or any equivalent — force-push, pushing tags, triggering
a push via a GitHub API/CLI call) in this repo. Commits can be made locally as normal,
but pushing to any remote is the user's action only, every time. Do not push even if
a prior commit was already pushed by the user, and do not push tags created locally.
If a task seems to require a push to be "done" (e.g. to trigger a release workflow),
finish everything else and tell the user a push is the remaining step — do not do it
for them, and do not ask "should I push?" as a way of getting a one-time yes that
covers future turns.
