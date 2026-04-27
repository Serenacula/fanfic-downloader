---
id: 0002-success-criteria
node: root-7f3a
status: answered
priority: high
blocks: []
blocked_by: [0001-audience]
created: 2026-04-27
resolved: 2026-04-27
---

# What does success look like?

## Context

"Done enough to use" and "feature complete" are usually different. Knowing the minimum viable bar helps prioritize what to build first, and knowing the feature-complete vision helps avoid designing ourselves into corners.

## Options (if any)

- **Done enough to use**: e.g. "can download a fic from AO3 as an ePub and save it to a folder"
- **Feature complete**: e.g. "all automation features in expanded plugin work reliably; native host installs cleanly; all target sites supported"

## Answer

**Initial version (done enough to use):** AO3 and FFN supported; download to ePub.

**Feature complete (fic-downloader):**
- Sites: AO3, FFN, Royal Road, Tapas, Scribble Hub, Wattpad, SpaceBattles, Sufficient Velocity, QuestionableQuesting
- Formats: ePub, PDF, HTML, Markdown, DOCX, TXT (MOBI/AZW3 dropped — no viable browser-extension generator; ODT dropped — hand-roll effort not justified until someone asks)
- User may adjust site targets based on real-world difficulty (e.g. anti-scrape measures)

**Future upgrade site priority order:**
1. AO3, 2. Royal Road, 3. FFN, 4. Tapas (novels), 5. Scribble Hub, 6. Wattpad,
7. SpaceBattles, 8. Sufficient Velocity, 9. QuestionableQuesting, 10. Webnovel,
11. Honeyfeed, 12. Inkitt, 13. Quotev

## Rationale

User specified the initial/feature-complete distinction explicitly. All 8 formats accepted. Anti-scrape measures on some sites (notably Royal Road) are an open unknown — site list may be adjusted based on difficulty.

## Drop / defer reason
