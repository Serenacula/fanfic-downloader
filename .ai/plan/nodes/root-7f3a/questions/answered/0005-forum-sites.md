---
id: 0005-forum-sites
node: root-7f3a
status: answered
priority: medium
blocks: []
blocked_by: []
created: 2026-04-27
resolved: 2026-04-27
---

# How should we treat forum-based sites (SpaceBattles, Sufficient Velocity, QuestionableQuesting)?

## Context

Forum-based fic sites (SB, SV, QQ) store fics as forum threads rather than dedicated chapter pages. This is a different technical problem from dedicated fic sites.

## Options (if any)

- **Same scope, handled with a forum-thread parser**: Treat as first-class sites.
- **Best-effort, explicitly marked lower quality**: Support but document rougher output.
- **Defer to post-feature-complete**: Drop from feature-complete target.

## Answer

Treat as first-class sites. Key technical context: all three forums support **threadmarks** (a structured index of the actual story posts) and a **read mode** that displays only the main story posts. This gives a clean extraction path — we can use the threadmarks/read mode URL rather than parsing raw forum threads. The technical problem is more tractable than it first appears.

## Rationale

User confirmed first-class treatment and provided the threadmark/read-mode mechanism as the extraction approach, which significantly reduces the complexity concern that motivated the question.

## Drop / defer reason
