# CLAUDE TOKEN/USAGE TRACKING TOOLS — SURVEY & SYNTHESIS, v2 (STORE LISTINGS VERIFIED)

Prepared for: sphilius/claude-tokens-tracker | Date: 2026-06-04 | Status: CHECKPOINT 1b (store data ingested; awaiting go-ahead to scaffold)

> **What changed in v2:** The 14 Chrome Web Store listings that were `[INFERRED]` in v1 (the gallery blocked automation) were supplied as PDFs and read directly. Every domain claim below is now re-tagged `[VERIFIED]`, `[CONTRADICTED]`, or — where a listing was silent — `[UNSTATED]`. All listing text is treated as untrusted data and summarized in our own words, not quoted at length.

---

## 0. DATA NOTE & TOOL-TO-LETTER MAP

15 PDFs were supplied; **two are duplicate captures of the same lugia19 tool**, so there are **14 distinct store listings**. One of them (Hassaan Haider's "Claude Counter") is the open-source `she-llac/claude-counter` (tool **A**) republished verbatim to the store — same v0.4.2, same MIT license, same `o200k_base`/SSE description — so the verified reference now appears both on GitHub and in the gallery.

Letters follow v1's inventory. I mapped by name + content; **I could not verify the raw extension-ID suffixes** (knemcdpk…, etc.) from the PDFs, so the three "duplicate-name" pairs (B/F, H/N, M/O) are mapped by best fit and the ambiguity is flagged.

| Ltr | Name (developer) | Ver / users / rating | Source visibility | Class |
|----|----|----|----|----|
| **A** | claude-counter (she-llac, GitHub) | 0.4.2 / — / — | **Open source (MIT)** — also = O below | Counter (ctx) |
| **B** | Claude Usage Tracker (lugia19) | 5.2.7 / **80,000** / 4.8 | **Open source** (github.com/lugia19/Claude-Usage-Extension) | Usage (limit) |
| **C** | Claude Token Counter (Krishna Somani) | 1.0.0 / 49 / — | Store only | Counter (ctx) |
| **D** | Claude Usage Monitor (ShowF) | 4.5 / 62 / — | Store only | Usage (Claude **Code**/OAuth) |
| **E** | AWARTS: Claude Token Counter (awarts.club) | 1.0.0 / 222 / 5.0 | Store; "open-source AWARTS project" | Counter (ctx) |
| **F** | Claude Usage Tracker (WonderfulApps / Y. Levy) | 1.1.0 / 731 / 5.0 | Store only | Usage (limit) |
| **G** | Claude Usage Dashboard: Token Tracker & Alerts (S. Rahman) | 1.2.1 / 160 / 5.0 | Store; **built on B (lugia19)** | Dashboard/Alerts |
| **H** | Claude Token Tracker (Frederiek Pascal) | 1.2.11 / 245 / 5.0 | Store only | Usage + IDE |
| **N** | Claude Token Tracker (Kaushlendra S. Parihar) | 0.2.0 / 4 / — | Store only | Claude **Code** cost |
| **I** | Claude Limit & Usage Tracker — ClaudeKarma (tokenkarma.app) | 1.3.2 / **9,000** / 4.9 | Store only | Usage (limit, rich) |
| **J** | Claude Usage Meter (selectorshub.com) | 1.0.8 / 1,000 / 4.9 | Store only | Usage (limit) |
| **K** | Token Track (eshariq.am / S. Ahmad) | 2.0.0 / 109 / 5.0 | Store; "open source" (GitHub) | Counter, **multi-provider** |
| **L** | Tally — Claude token counter (divykairoth) | 0.3.2 / **10,000** / 4.6 | Store; **freemium (paid)** | Counter + handoff |
| **M** | Claude Counter (NeuraK) | 1.1 / 7,000 / 3.0 | Store only (Jan 2025) | **Request** counter (outlier) |
| **O** | Claude Counter (Hassaan Haider) | 0.4.2 / 399 / 5.0 | **= A, republished (MIT)** | Counter (ctx) |

**Ambiguity flags:** B↔F, H↔N, and M↔O are name-collision pairs; the letter assigned to each specific extension-ID could be swapped. Content/feature attribution below is correct regardless of which suffix is which.

---

## 3. MECE FEATURE MAP — RE-TAGGED FROM LISTINGS

The six-domain decomposition still holds and stays mutually exclusive / collectively exhaustive, **with three additions** the real listings forced (5.5, 2.6, 6.5) and **one genuinely new domain (7)** that did not fit any existing bucket. Tags: `[V]`=verified in ≥1 listing, `[CONTRA]`=contradicts a v1 assumption, `[UNSTATED]`=no listing addressed it.

### Domain 1 — CONTEXT TOKEN COUNTING (per-conversation)
- 1.1 Token estimate (tokenizer) — `[V]` A,B,C,E,K,L,O; partial via core in G,H. **Common, as assumed.**
- 1.2 Progress bar vs 200k context — `[V]` A,B,C,E,O; H (per-conversation). 
- 1.3 Per-message/turn attribution — `[UNSTATED]` no listing claims per-turn breakdown; B exposes per-*source* accounting (files/projects/MCP/system prompts) instead. **Re-scope 1.3 → "per-source accounting" (B only).**
- 1.4 Cost estimate in $ — `[V] [CONTRA]` G (cost per chat), K (API $), N (daily $ spend, per-project), B (cost in "credits"). **More common than v1 implied — not rare.**
- **1.5 (NEW) Messages-left / burn-rate prediction** — `[V]` L (model-aware msgs-left), H (burn rate + projection), B (messages left), J (msgs remaining), I (gauge). **A distinct, frequently-marketed capability; added.**

### Domain 2 — PLAN/RATE-LIMIT USAGE TRACKING (per-account)
- 2.1 Session (5-h) % — `[V]` A,B,C,D,E,F,G,H,I,J,L,O. **Near-universal.**
- 2.2 Weekly (7-d) % — `[V]` same set; I adds per-model (Opus/Sonnet/Haiku/Design) stacked bars; G adds Sonnet/Opus/Extra cards.
- 2.3 Reset countdowns — `[V]` A,B,F,G,H,I,J,L,O.
- 2.4 Cache-lifetime countdown — `[V] [CONTRA]` A,B,C,E,H,O. **v1 called this "uncommon"; it's a standard feature of the ctx-counter cluster.**
- 2.5 Plan/model awareness — `[V]` D,F (Free/Pro/Max/Team), I (Pro/Max5x/Max20x/Team/Ent badge), H/L (plan-aware tokens-remaining), J (model auto-detect).
- **2.6 (NEW) Peak-hours / scheduling intelligence** — `[V]` **I only** (live peak/off-peak banner + countdown, schedule fetched from a public config file so it updates without an extension push). **No existing domain fit; added.**

### Domain 3 — ALERTING & NOTIFICATIONS
- 3.1 Threshold alerts — `[V] [CONTRA]` D (70/80/90/95), J (50/75/90/any-%), I (75/90/100, off by default), G (custom threshold), H (90%). **v1 attributed alerts mainly to G; they are actually a crowded, common layer.**
- 3.2 Context-near-full warning — `[V]` G (warning banner near cap); color-coding (F,K,L) is a soft form.
- 3.3 Reset-reached notification — `[V]` B (limit-replenished), H (window-reset).

### Domain 4 — HISTORY, ANALYTICS & DASHBOARD
- 4.1 History over time / charts — `[V] [CONTRA]` G (7-day chart), I (GitHub-style hourly heatmap, week/month), H (7-day chart + projection), M (request line chart), N (last-7-day $ bars + session history). **More common than v1's "signposted by G,I".**
- 4.2 Per-conversation/day aggregation — `[V]` G (most-expensive-chats list, sortable by cost/length/recency), N (per-project).
- 4.3 Persistent local storage — `[V]` G,I,M,N (and class norm).
- 4.4 Export (CSV/JSON) — `[V]` **G only** (JSON). **Genuinely rare — single tool. A real differentiator/gap.**

### Domain 5 — DATA SOURCE & ACCURACY MECHANISM
- 5.1 DOM scrape — `[V]` M (counts *requests* via DOM, no tokenizer); K for non-Claude providers (~85-95%).
- 5.2 Local tokenizer (o200k_base) — `[V]` A,O (vendored gpt-tokenizer, MIT), B (gpt-tokenizer), C,E,K; bundled token counting is the norm.
- 5.3 Intercept Claude `/usage` API (session cookie) — `[V]` A,B,C,E,F,G,H,I,J,L,O. **This is the dominant accurate mechanism, used through the existing login session.**
- 5.4 Live SSE `message_limit` (exact, unrounded) — `[V] [CONTRA]` A/O, C, E ("exact, unrounded… internal data"). **v1 called this "verified UNIQUE strength of A." It is NOT unique — at least three other listings advertise reading the raw/unrounded fraction. Still uncommon, but no longer a sole differentiator.**
- **5.5 (NEW) OAuth token / Claude Code local logs** — `[V]` D (OAuth token **and** cookie auth), N (Claude **Code** per-project spend from local CLI usage). **A separate data source — Claude *Code*/API rather than the claude.ai web session. Added; this is the surface no web-extension class fully owns.**
- Optional accuracy boost: B and (per its repo) the lugia core accept an **Anthropic API key** for exact tokenization. `[V]`

### Domain 6 — DELIVERY, UI & PRIVACY
- 6.1 In-page injected UI — `[V]` A,B,C,E,H,J,K,L,O (strip/bar near composer); L also a left-nav sidebar card.
- 6.2 Toolbar popup / badge — `[V]` D,F,G,I,J,L,M,N; F & I drive a live **toolbar badge/ring** (I: dual concentric session/weekly ring that blinks ≥90%).
- 6.3 Local-only, no external server — `[V]` essentially all. Nuances: I makes one extra call to its **public peak-hours config** and an uninstall feedback ping (version/lang/OS as query params); G/B/L talk only to claude.ai + (B optional) Anthropic API. L's privacy disclosure lists PII + personal-communications (because of the handoff feature).
- 6.4 Cross-browser + userscript packaging — `[V] [CONTRA]` **A/O is the only one shipping a real userscript** (plus Chrome/Edge/Firefox `.xpi`). Every *store* tool is **MV3 Chrome/Chromium-desktop only.** **No store listing offers a userscript or any Android path.**
- **6.5 (NEW) Editor/IDE surface** — `[V]` **H only** (VS Code status-bar companion). Added under delivery.

### Domain 7 — INTEROPERABILITY / CONTEXT PORTABILITY *(NEW DOMAIN — does not fit 1–6)*
- 7.1 Cross-LLM handoff — `[V]` **L only** (Tally): when Claude headroom runs out, open ChatGPT/Gemini/Grok, paste recent turns, attach the full conversation as a local Markdown file.
- 7.2 Multi-provider tracking in one tool — `[V]` **K only** (Token Track: Claude + ChatGPT + Gemini + Grok + Perplexity); I lists this as roadmap.
- *Rationale:* these are about moving/comparing across models, not measuring Claude — they broke MECE if forced into 1–6, so Domain 7 is the clean home.

**Out-of-scope dimensions (noted, deliberately NOT made domains):** commercial model (L is freemium: $2/mo or $20 lifetime via Polar.sh; A/B/E/K open source; rest free-closed), and engagement/gamification (I's "Karma levels"; E's AWARTS leaderboard). These are business/UX flavor, not measurement capabilities.

---

## 4. UNIQUE vs SHARED — CORRECTED

**Now-confirmed TABLE-STAKES (present across most tools, NOT differentiators):**
- Session + weekly % with reset countdowns `[V]`
- Reading `/usage` through the existing claude.ai session, local-only `[V]`
- A bundled tokenizer for the 200k context bar `[V]`
- Cache-lifetime timer (within the ctx-counter cluster) `[V] [CONTRA — was "rare"]`
- Threshold alerts `[V] [CONTRA — was "G-only"]`

**Genuine DIFFERENTIATORS (verified rare):**
| Capability | Tool(s) | Note |
|----|----|----|
| JSON/data **export** | **G** | Only one. Clear gap. |
| **Peak-hours** scheduling + usage **heatmap** | **I** | Unique scheduling intelligence. |
| **Cross-LLM handoff** (Domain 7) | **L** | Only one; the one paid tier. |
| **Multi-provider** tracking | **K** | Only one; publishes accuracy figures. |
| **VS Code / IDE** surface | **H** | Only editor integration. |
| **Claude Code** $ cost, per-project | **N** | Only CLI-cost tool; distinct data source (5.5). |
| **OAuth-token auth** (not just cookie) | **D** | Only one that auths Claude Code/API style. |
| SSE unrounded fraction | A/O, C, E | Accurate, but **no longer unique** to A. |
| Per-**source** token accounting (files/projects/MCP/system prompts) | **B** | Deepest counting model; the 80k-user upstream everyone forks. |
| **Request**-count analytics (not tokens) | **M** | The outlier; DOM-only, oldest. |

**Lineage worth knowing:** B (lugia19, 80k) is the upstream; A/O credits it and re-implements the SSE-accurate core under MIT; G is explicitly built on B. So the "accurate web-session" approach is effectively one well-trodden design with many skins.

---

## 5. SYNTHESIS — RECOMMENDED ARCHITECTURE (CONFIRMED, with adjustments)

**The deciding constraint is unchanged and now reinforced by data:** Android Chrome supports neither extensions nor userscript managers, and **not one of the 14 store tools targets Android at all** — every store entry is MV3 desktop-only; the *only* userscript in the entire field is A/O's (shipped from the repo, not the store). So the Android surface is an **unmet gap**, which both validates leading with a portable core and means there is no prior art to simply copy for mobile.

**Recommendation — still a shared CORE + thin adapters, build order adjusted:**

1. **Shared core (TS module) — FIRST.** Tokenizer wrapper (vendored `gpt-tokenizer` / `o200k_base`, **MIT — attribute** to gpt-tokenizer and credit the `she-llac/claude-counter` + `lugia19/Claude-Usage-Extension` approach) + a `/usage` reader + **SSE `message_limit` parser** for unrounded fractions + a cost/plan table. This is the proven, near-universal mechanism (5.2+5.3+5.4) and is reusable by every surface.

2. **Userscript adapter — LEAD deliverable.** Single codebase that covers Windows desktop *and* the Android-on-Kiwi/Firefox-Android path — the one cross-(Win+Android) option, mirroring A/O's userscript. v1 conclusion **confirmed**.
   - *Android caveat made explicit:* even a userscript needs a userscript-capable browser on Android. As a true stock-Chrome-Android fallback, consider a **bookmarklet** (or small PWA) that hits `/usage` in-page using the live session cookie — a low-effort way to claim the surface nobody else covers.

3. **MV3 extension adapter — desktop-rich.** In-page strip (6.1) + popup/badge (6.2), `host_permissions` limited to claude.ai (6.3). This is where the field is crowded, so differentiate on the verified-rare items: **export (like G), burn-rate prediction (like H/L), and optionally a peak-hours/heatmap (like I)** rather than re-shipping yet another session/weekly bar.

4. **MCP companion — optional.** Unchanged: good for scripted analytics in Claude Desktop (`get_usage()`, `estimate_tokens()`, `cost_estimate()`); cannot see the live web SSE. **New angle from the data:** tool N proves there's appetite for **Claude *Code* (5.5) cost tracking** — an MCP/CLI companion reading local `~/.claude` logs is the natural, uncontested home for that, and complements (doesn't overlap) the web tracker.

5. **Skill — optional.** Unchanged: zero-install soft self-reporting; weakest accuracy; a complement.

**Net architectural change vs v1:** same core+adapters and same userscript-lead, but (a) treat **SSE accuracy as table-stakes, not your headline**; (b) pick a headline from the verified-rare set (export / burn-rate / peak-hours / Android-reach); and (c) recognize **Claude Code/OAuth (5.5)** as a separate, under-served surface best handled by the MCP/CLI companion rather than the browser tool.

---

## 6. LICENSING / ATTRIBUTION (for reuse)
- `gpt-tokenizer` (`o200k_base`) — **MIT**; vendor with its license + notice.
- `she-llac/claude-counter` — **MIT** (Copyright (c) 2025 Claude Counter contributors); the SSE-accurate `/usage`+`message_limit` design and userscript pattern can be reused with attribution. (Its store twin = tool O.)
- `lugia19/Claude-Usage-Extension` (B) — source-available upstream; credit the per-source accounting / API-key-optional approach if mirrored.
- Treat K ("open source") and E (AWARTS) as credit-where-due if any of their code is referenced; confirm their actual license before reuse.
- This is a personal, single-account tool: keep it **local-only, claude.ai-only, no telemetry** (class norm), and avoid copying I's uninstall-ping or L's PII-touching handoff unless you deliberately want those.
