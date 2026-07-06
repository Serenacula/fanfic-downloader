# Decision Log

## 2026-04-27 — Concurrency model: global queue, 3 concurrent, configurable delay

**Node:** `download-flow-2e6c`
**Question:** `0003-concurrency-model`
**Decision:** Single global chapter request queue. All fic downloads share it. Max 3 concurrent in-flight requests (fixed). Minimum delay between requests is user-configurable.
**Rationale:** Queue naturally handles rate limiting across concurrent fic downloads without per-fic coordination. Fixed cap prevents site hammering.
**Affects:** `download-orchestrator` child node, `settings-8d4b` (min delay setting already there).

---

## 2026-04-27 — Download manager popup (supersedes direct-click approach)

**Node:** `download-flow-2e6c`
**Question:** `0002-download-manager` (supersedes `0001-download-trigger`)
**Decision:** Extension icon always opens a download manager popup. Contains active/recent download list with per-download progress, "Download" button (for current fic), "Download by URL" button. Confirmation dialogue appears as inline popup screen when enabled.
**Rationale:** Multiple concurrent downloads require a management UI; single-click direct download doesn't scale.
**Affects:** `scaffolding-7c2d` (browser action always has popup), `download-flow-2e6c`.

---

## 2026-04-27 — Format features: cover page, TOC, cover image

**Node:** `format-generation-9f5a`
**Question:** (feature proposals)
**Decision:** All three included by default, each independently togglable in settings. Cover image (generated title card) is a separate setting from inline images.
**Rationale:** User accepted all three. Defaults-on gives best out-of-box experience; toggles give power users control.
**Affects:** `settings-8d4b` (three new toggles), `format-generation-9f5a` (must implement per format).

---

## 2026-04-27 — Chapter fetching: always fetch fresh with rate limiting

**Node:** `content-extraction-4b1e`
**Question:** `0002-chapter-fetching`
**Decision:** Always fetch all chapters fresh via HTTP; ignore DOM. Configurable rate limiting between requests.
**Rationale:** DOM-first saves at most one request, adds implementation complexity, and risks stale content. Rate limiting covers the actual concern (bulk fetches).
**Affects:** `content-extraction-4b1e` (fetch loop), `settings-8d4b` (rate limit config).

---

## 2026-04-27 — Data model: universal core + site-specific metadata

**Node:** `content-extraction-4b1e`
**Question:** `0001-data-model-shape`
**Decision:** Universal core fields + structured site-specific metadata section per site. Each site defines its own metadata schema; format generation handles each explicitly.
**Rationale:** Preserving site-specific field structure (e.g. AO3's fandom/relationship/character/additional tag distinctions) leads to richer output. Worth the extra per-site work in renderers.
**Affects:** `format-generation-9f5a` (must handle per-site metadata), `download-flow-2e6c` (confirmation dialogue shows variable fields), `settings-8d4b` (story info field config may be per-site).

---

## 2026-04-27 — Forum-based sites: first-class, threadmark extraction

**Node:** `root-7f3a`
**Question:** `0005-forum-sites`
**Decision:** SB, SV, QQ are first-class feature-complete targets. Extraction uses threadmarks and read mode, not raw thread parsing.
**Rationale:** All three forums provide structured story indexes (threadmarks) and a read mode that filters to main story posts — clean enough to match dedicated site quality.
**Affects:** Site extraction node for forum sites.

---

## 2026-04-27 — Pre-download confirmation dialogue

**Node:** `root-7f3a`
**Question:** `0007-metadata-editing`
**Decision:** Optional confirmation dialogue (togglable in settings). When enabled, user can adjust title, author, series, summary before download. When disabled, download proceeds immediately.
**Rationale:** User wanted a lightweight optional step, not a full metadata editor. Post-download ePub editing is explicitly out of scope.
**Affects:** Settings node (toggle), download flow node, UI node.

---

## 2026-04-27 — Out of scope boundaries

**Node:** `root-7f3a`
**Question:** `0003-out-of-scope`
**Decision:** In-browser reader, cloud sync, chapter-level downloads, cross-browser, translation are all out of scope. Images and story info text are in scope with configurable settings.
**Rationale:** User confirmed each item explicitly.
**Affects:** Settings node (image toggle, story info toggle); fanfic-downloader-expanded (calibre/translation maybe in scope there).

---

## 2026-04-27 — Success criteria: initial version and feature-complete targets

**Node:** `root-7f3a`
**Question:** `0002-success-criteria`
**Decision:** Initial = AO3 + FFN + ePub. Feature-complete = 9 sites + 8 formats (ePub, PDF, MOBI, HTML, Markdown, DOCX, TXT, ODT). Site list may flex.
**Rationale:** User specified targets explicitly; acknowledged anti-scrape unknowns may force adjustments.
**Affects:** `fanfic-downloader` site-support nodes, format conversion node.

---

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
**Decision:** Rust for the native messaging host in fanfic-downloader-expanded.
**Rationale:** User explicitly chose Rust; needed to bypass Firefox filesystem sandbox.
**Affects:** `fanfic-downloader-expanded`, native host node (TBD).

---

## 2026-04-27 — Sharing model: opportunistic

**Node:** `root-7f3a`
**Question:** (stated by user in project description)
**Decision:** Shared code in `shared/` folder where it naturally fits; not a design constraint.
**Rationale:** User stated this explicitly — the expanded plugin's partial independence makes strict sharing impractical.
**Affects:** Project structure, build tooling.

---
