# Decision Log

## 2026-04-27 — Audience: Public AMO release

**Node:** `root-7f3a`
**Question:** `0001-audience`
**Decision:** Both plugins are intended for public release on addons.mozilla.org.
**Rationale:** User stated "I plan on a public release."
**Affects:** All nodes — requires polished UX, user-facing errors, AMO-compliant permission declarations, clean native host install story.

---

## 2026-04-27 — Platform: Firefox WebExtension

**Node:** `root-7f3a`
**Question:** (stated by user in project description)
**Decision:** Build as Firefox WebExtension plugins only.
**Rationale:** User explicitly stated Firefox plugins.
**Affects:** All nodes — determines API surface, manifest format, permission model.

---

## 2026-04-27 — Native client language: Rust

**Node:** `root-7f3a`
**Question:** (stated by user in project description)
**Decision:** Rust for the native messaging host in fic-downloader-expanded.
**Rationale:** User explicitly chose Rust; needed to bypass Firefox filesystem sandbox.
**Affects:** `fic-downloader-expanded`, native host node (TBD).

---

## 2026-04-27 — Sharing model: opportunistic

**Node:** `root-7f3a`
**Question:** (stated by user in project description)
**Decision:** Shared code in `shared/` folder where it naturally fits; not a design constraint.
**Rationale:** User stated this explicitly — the expanded plugin's partial independence makes strict sharing impractical.
**Affects:** Project structure, build tooling.

---
