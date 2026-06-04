CLAUDE TOKEN/USAGE TRACKING TOOLS — TAB SURVEY & SYNTHESIS REPORT  
Prepared for: sphilius/claude-tokens-tracker  |  Date: 2026-06-03  |  Status: CHECKPOINT 1 (analysis complete, awaiting go-ahead to build)

0\. METHOD & DATA-ACCESS NOTE (read first)  
This group contained 17 tabs: your empty target repo, this report doc, 1 readable open-source GitHub repo (she-llac/claude-counter), and 14 Chrome Web Store listings. Important limitation: the Chrome Web Store domain ([chromewebstore.google.com](http://chromewebstore.google.com)) is a protected gallery that blocks ALL browser automation — screenshots, DOM reads, text extraction, and cross-origin fetch all returned hard errors. I therefore could not read the 14 store descriptions directly. To stay honest, every claim below is tagged: \[VERIFIED\] \= read from source I could access; \[INFERRED\] \= deduced from the extension’s name/title; \[DOMAIN-KNOWLEDGE\] \= typical of this tool class. Before we build, you may want to paste the text of any specific store listing you care about so I can upgrade \[INFERRED\] rows to \[VERIFIED\].

1. TAB INVENTORY (the 16 content tabs analyzed)  
2. A. she-llac/claude-counter (GitHub, open source, MIT) — \[VERIFIED\]  
3. B. Claude Usage Tracker (knemcdpk…) — store — \[INFERRED\]  
4. C. Claude Token Counter (bioobpob…) — store — \[INFERRED\]  
5. D. Claude Usage Monitor (ehehkgjh…) — store — \[INFERRED\]  
6. E. AWARTS: Claude Token Counter (ocfdlile…) — store — \[INFERRED\]  
7. F. Claude Usage Tracker (gkhlihfa…) — store — \[INFERRED\]  
8. G. Claude Usage Dashboard: Token Tracker & Alerts (neoobohc…) — store — \[INFERRED\]  
9. H. Claude Token Tracker (jakogmbc…) — store — \[INFERRED\]  
10. I. Claude Limit & Usage Tracker — ClaudeKarma (hoffoefg…) — store — \[INFERRED\]  
11. J. Claude Usage Meter (kgpahkcg…) — store — \[INFERRED\]  
12. K. Token Track (lfoldomc…) — store — \[INFERRED\]  
13. L. Tally — Claude token counter (baicaaie…) — store — \[INFERRED\]  
14. M. Claude Counter (hjoepjap…) — store — \[INFERRED\]  
15. N. Claude Token Tracker (eigpmkgm…) — store — \[INFERRED\]  
16. O. Claude Counter (dpkidbia…) — store — \[INFERRED\]  
17. (Plus your empty target repo and this doc.)

2\. VERIFIED DEEP-DIVE: she-llac/claude-counter (the one tool I could fully read)  
This is the most useful reference because it is open source and its mechanics are documented. It credits lugia19’s “Claude Usage Tracker” as inspiration. Its verified feature set and architecture:

* Token count: approximate per-conversation token count with a mini progress bar against the 200k context limit.  
* • Cache timer: countdown for how long the conversation stays cached (cheaper to continue).  
* • Usage bars: session (5-hour) and weekly (7-day) usage with progress bars and reset countdowns.  
* • Accuracy edge: reads live SSE message\_limit data which gives exact, unrounded utilization fractions — more accurate than Claude’s rounded /usage page.  
* • Mechanism: intercepts Claude API responses; uses a vendored o200k\_base tokenizer (gpt-tokenizer, MIT) for counting; watches DOM mutations to inject UI as you navigate.  
* • Privacy: all local, no external servers/tracking; reads lastActiveOrg cookie to query /usage; requests only to [claude.ai](http://claude.ai).  
* • Distribution: Chrome/Edge/Chromium (unpacked zip via Developer mode), Firefox (.xpi), and a userscript variant. Latest seen: v0.4.2.

3\. MECE FEATURE MAP (mutually exclusive, collectively exhaustive)  
The feature space of this whole tool class decomposes into six non-overlapping capability domains. Within each, features are listed once and only once. The two naming clusters in the tab set map onto this: “Counter / Token Counter / Token Track / Tally” titles emphasize Domain 1 (context counting); “Usage Tracker / Monitor / Meter / Dashboard / Limit Tracker / Karma” titles emphasize Domains 2-3 (plan-limit tracking \+ alerts).

Domain 1 — CONTEXT TOKEN COUNTING (per-conversation)  
  1.1 Current conversation token estimate (tokenizer-based)  
  1.2 Progress bar vs context-window limit (e.g. 200k)  
  1.3 Per-message / per-turn token attribution  
  1.4 Cost estimate in $ from token x model price  
  Tool emphasis: Token Counter (C,E), Token Track (K), Tally (L), Counter (M,O), claude-counter (A). \[INFERRED except A\]

Domain 2 — PLAN/RATE-LIMIT USAGE TRACKING (per-account)  
  2.1 Session (5-hour rolling) usage %  
  2.2 Weekly (7-day) usage %  
  2.3 Reset countdown timers for each window  
  2.4 Cache-lifetime countdown (cheaper-to-continue signal)  
  2.5 Plan/tier awareness (Free/Pro/Max, model-specific caps)  
  Tool emphasis: Usage Tracker (B,F), Monitor (D), Meter (J), Limit Tracker/Karma (I), Dashboard (G), claude-counter (A). \[INFERRED except A\]

Domain 3 — ALERTING & NOTIFICATIONS  
  3.1 Threshold alerts (e.g. 80%/95% of a limit)  
  3.2 Context-near-full warning  
  3.3 Reset-reached notification  
  Tool emphasis: Dashboard: Token Tracker & Alerts (G) names this explicitly. \[INFERRED\]

Domain 4 — HISTORY, ANALYTICS & DASHBOARD  
  4.1 Historical usage over time / charts  
  4.2 Per-conversation or per-day aggregation  
  4.3 Persistent local storage of stats  
  4.4 Export (CSV/JSON)  
  Tool emphasis: Dashboard (G), ClaudeKarma (I). \[INFERRED\]

Domain 5 — DATA SOURCE & ACCURACY MECHANISM  
  5.1 DOM-scrape of visible text (lowest accuracy)  
  5.2 Local tokenizer estimate (medium; e.g. o200k\_base)  
  5.3 Intercept Claude /usage API (account-accurate but rounded)  
  5.4 Live SSE message\_limit parsing (exact, unrounded — claude-counter’s edge)  
  Tool emphasis: A uses 5.2+5.3+5.4 (verified); others \[INFERRED\] mostly 5.⅕.2.

Domain 6 — DELIVERY, UI & PRIVACY  
  6.1 Injected in-page UI (badge/bar near composer)  
  6.2 Toolbar popup / options page  
  6.3 Local-only, no external server (privacy)  
  6.4 Cross-browser packaging (Chrome/Edge/Firefox/userscript)  
  Tool emphasis: A verified on all four; others \[INFERRED\] 6.1–6.3.

4\. UNIQUE vs SHARED FEATURES (cross-tool synthesis)  
SHARED / TABLE-STAKES (present in essentially every tool): a token or usage number surfaced in-page, a progress bar against some limit, and local-only operation. These are baseline expectations, not differentiators.  
DIFFERENTIATORS (where individual tools stand apart):

* Accuracy via SSE message\_limit parsing — verified unique strength of claude-counter (A).  
*   • Explicit alerting layer — signposted by Dashboard: Token Tracker & Alerts (G).  
*   • Long-run analytics/history — signposted by Dashboard (G) and ClaudeKarma (I).  
*   • Cache-lifetime timer — verified in A; uncommon elsewhere.  
*   • Cross-browser \+ userscript packaging — verified breadth in A.  
*   • Minimalism as a feature — the many “Counter/Tally/Token Track” tools likely compete on being lightweight/single-purpose. \[INFERRED\]

5\. SYNTHESIS — RECOMMENDED ARCHITECTURE FOR claude-tokens-tracker  
Your stated targets are three different delivery vehicles. They are not mutually exclusive; the smart move is a shared CORE library with three thin adapters. Recommendation by requirement:

1) Windows 11 \+ Android Chrome requirement → This is the deciding constraint. Android Chrome does NOT support extensions. So a classic MV3 extension cannot satisfy “works on Android mobile chrome.” Two viable paths: (1) a Userscript (Tampermonkey/Violentmonkey works on Kiwi/Firefox-Android and some Chromium-Android forks) which maximizes reach with one codebase; or (2) accept that the EXTENSION is desktop-only and pair it with a separate lightweight mobile path. Realistically, a userscript is the single best cross-(Win+Android) option, mirroring claude-counter’s userscript variant.  
2) (b) Chrome extension (MV3) → best desktop UX: in-page injected bar (6.1) \+ popup (6.2). Reuse the proven mechanism: tokenizer (5.2) \+ /usage interception (5.3) \+ SSE parsing (5.4). Local storage for history (4.3). Manifest V3, content script \+ service worker, host\_permissions limited to [claude.ai](http://claude.ai) (privacy 6.3).  
3) © MCP tool/server → right for programmatic/desktop-agent use, NOT for live in-browser bars. An MCP server can expose tools like get\_usage(), estimate\_tokens(text), and cost\_estimate() to Claude Desktop. It cannot see your live web session’s SSE stream, so it would rely on the public token-counting / messages APIs and your own logging. Best treated as a COMPANION for scripted analytics, not the primary tracker.  
4) (d) Skill / system instructions → lightweight and zero-install. A Skill can teach Claude Desktop to self-report approximate token usage, warn near context limits, and explain /usage — but it has NO access to exact account limits or SSE data, so accuracy is the weakest of the four. Good as a complement, not a replacement.  
5) RECOMMENDED BUILD ORDER: 1\) Shared core (tokenizer wrapper \+ usage/SSE parser \+ cost table) as a small TS module. 2\) Userscript adapter (covers Windows \+ Android in one). 3\) MV3 extension adapter (richest desktop UX, reuses core). 4\) Optional MCP companion for Claude Desktop analytics. 5\) Optional Skill for zero-install soft tracking. This is MECE: each layer owns a distinct surface (in-page live / programmatic / instructional) with no overlap.

6\. CHECKPOINT — DECISIONS NEEDED BEFORE I WRITE CODE

1) Data gap: I could not read the 14 store listings (gallery is automation-blocked). Do you want to paste any of their descriptions so I can verify features, or proceed on the analysis above?  
2) 2\) Primary target: Given the Android requirement, do you agree the USERSCRIPT (+ shared core) is the lead deliverable, with the MV3 extension as the desktop-rich version?  
3) 3\) Scope of v1: Which domains (1–6) are must-haves vs later? (Suggest v1 \= Domains 1, 2, 6; alerts/history in v2.)  
4) 4\) MCP & Skill: build now or defer as companions?  
5) 5\) Licensing/reuse: OK to reuse the MIT-licensed gpt-tokenizer (o200k\_base) and follow claude-counter’s documented approach with attribution?  
6) 6\) Privacy: confirm local-only, [claude.ai](http://claude.ai)\-only, no telemetry (matches the class norm).

STOP POINT: Per your instruction I am pausing here. On your go-ahead (and answers above), I’ll scaffold the chosen deliverable into the claude-tokens-tracker repo. Note: I can draft code and file contents, but per safety policy I will not create accounts, change repo permissions, or commit/push on your behalf without you driving those steps — I’ll prepare the files and guide you to commit.