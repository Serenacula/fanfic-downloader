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

## Commit messages must be descriptive, not just a batch label

Spotted in CHANGELOG.md (2026-07-13): commits like `apply bug-loop iteration-1 fixes
(F-01 through F-09)` and `apply bugloop iteration-9 fixes (F-01 through F-07)` — these
came from an automated bugloop run that batched several unrelated fixes under one
opaque label instead of describing what was actually fixed. A commit message like this
is useless in the changelog and in `git log`/`git blame`: it tells a reader nothing
about user-visible behavior, and forces them to open the diff to find out what F-03
even was.

Every commit — whether written by hand or by an automated loop (bugloop, plan
execution, etc.) — must describe what changed in terms someone reading the changelog
would understand, per the global commit-message rules (conventional commit type,
message states what changed and why). If a single commit really does bundle several
distinct fixes, either: (a) split it into one commit per fix (preferred — this repo's
worklog/plan conventions already ask for one commit per work item), or (b) if bundling
is unavoidable, write a message that summarizes what each fix actually does, not just
an internal iteration/ticket ID. "Fixed F-01 through F-09" is not a summary.
