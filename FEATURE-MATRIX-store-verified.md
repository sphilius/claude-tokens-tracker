# PER-TOOL FEATURE MATRIX (store listings verified, 2026-06-04)

Legend: ✓ stated · ~ partial/implied · – not mentioned. Tools as rows; the six domains' key sub-features (+ new 1.5/2.6/5.5/6.5/Domain 7) as columns.

**Mechanism codes:** T=local tokenizer (o200k/gpt-tokenizer) · K=optional Anthropic API key · U=/usage API via session · S=SSE unrounded · O=OAuth token · L=local Claude Code logs · D=DOM/request-count.
**Surface codes:** I=in-page strip/bar · S=sidebar card · P=popup · B=toolbar badge/ring · E=editor(VS Code).

| Tool (dev) | 1.1 tok | 1.2 ctx200k | 1.4 $cost | 1.5 msgs-left/burn | 2.1 sess% | 2.2 wk% | 2.3 reset | 2.4 cache | 2.5 plan/model | 2.6 peak | D3 alerts | 4.1 history | 4.4 export | D5 mechanism | D6 surfaces | 6.4 userscript/x-browser | D7 interop |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **A** claude-counter (she-llac) | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | ✓ | ~ | – | – | – | – | T+U+S | I,P | ✓ FF+userscript | – |
| **B** Usage Tracker (lugia19, 80k) | ✓ | ✓(length) | ✓(credits) | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | – | ✓(replenish) | ~(stats) | – | T+K+U | I,P | ~ | – |
| **C** Token Counter (Krishna) | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | ✓ | – | – | – | – | – | T+U+S | I | – | – |
| **D** Usage Monitor (ShowF) | – | – | – | – | ✓ | ✓ | ~ | – | ✓(Pro) | – | ✓(70/80/90/95) | – | – | **O+cookie** | P | – (4-5 langs) | – |
| **E** AWARTS Token Counter | ✓ | ✓ | – | – | ✓ | ✓ | ~ | ✓ | – | – | – | – | – | T+U/S | I | – (OSS) | – |
| **F** Usage Tracker (WonderfulApps, 731) | – | – | – | – | ✓ | ✓ | ✓ | – | ✓(Free/Pro/Max/Team) | – | ~(color) | – | – | U | P,**B** | – (13.5KiB) | – |
| **G** Dashboard+Alerts (Rahman) | ~ | ~ | ✓(per chat) | – | ✓ | ✓(+Opus/Sonnet/Extra) | ✓ | – | ✓ | – | ✓(custom) | ✓(7-day chart) | ✓**(JSON, only one)** | built on B (T+U) | P | – | – |
| **H** Token Tracker (Frederiek, 245) | ✓ | ✓(per-convo) | – | ✓(burn+projection) | ✓ | ✓ | ✓ | ✓(status) | ✓(Pro/Max5x/20x→tokens) | – | ✓(90%+reset) | ✓(7-day+proj) | – | U | I,S,P,**E** | ~ **VS Code** | – |
| **N** Token Tracker (Kaushlendra, 4) | ✓(CC) | – | ✓✓(daily $, per-project) | – | ✓(CC sessions) | – | – | – | – | – | – | ✓(session hist, 7-day $) | – | **L (Claude Code)** | P | – | – |
| **I** ClaudeKarma (9k) | – | – | – | ~(gauge) | ✓(gauge) | ✓(per-model bars) | ✓ | – | ✓(badge Pro/Max/Team/Ent) | ✓✓**(banner+live config)** | ✓(75/90/100, off-default) | ✓**(heatmap wk/mo)** | – | U+public-config | P,**B(dual ring)** | – (9 langs) | ~(roadmap) |
| **J** Usage Meter (selectorshub, 1k) | – | – | – | ✓(msgs left) | ✓ | ✓ | ✓ | – | ✓(model auto-detect) | – | ✓(50/75/90/any) | – | – | U | I(strip),P | – (refresh 1-60m) | – |
| **K** Token Track (109) | ✓✓(as you type) | ~ | ✓(API $) | – | ✓ | ✓ | – | – | ~ | – | ~(color) | – | – | U(95-100%)+D(other) | I | – OSS | ✓**multi-provider** |
| **L** Tally (10k, **paid**) | ✓ | ~ | – | ✓✓(model-aware) | ✓ | ✓ | ✓ | – | ✓(Opus/Sonnet/Haiku) | – | – | – | ~(transcript dl) | U | I,S,P | ~(cross-device login) | ✓✓**handoff→GPT/Gemini/Grok** |
| **M** Counter (NeuraK, 7k) | – | – | – | – | – | – | – | – | ~(premium aware) | – | – | ✓(request line chart) | – | **D (requests, not tokens)** | P | – | – |
| **O** Counter (Hassaan, 399, MIT) = A | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | ✓ | ~ | – | – | – | – | T+U+S | I,P | – (= A's code) | – |

## Unique differentiator — one line each

- **A / O** — The MIT, SSE-accurate reference implementation; **the only one with a real userscript** (A) / the same code shipped to the store (O).
- **B (lugia19)** — The 80k-user upstream everyone forks; **deepest token accounting** (files, projects, MCPs, system prompts) + optional API-key exactness.
- **C (Krishna)** — A plain, "unofficial" clone of the A/B feature set; no standout.
- **D (ShowF)** — **Only dual OAuth-token + cookie auth** (Claude Code/API-style sessions); circular gauges; multilingual.
- **E (AWARTS)** — A-style counter wired into an external **cross-platform coding leaderboard** (gamified/social).
- **F (WonderfulApps)** — Ultra-light **toolbar-badge %** with plan auto-detect and 1-min refresh; no in-page UI.
- **G (Dashboard)** — **Only JSON export** + per-conversation **cost ranking** + full dashboard; built on B (attributed).
- **H (Frederiek)** — **VS Code status-bar companion** + **burn-rate projection** + plan-aware tokens-remaining.
- **N (Kaushlendra)** — **Only Claude *Code* (CLI) $-cost tracker**: daily spend, per-project, session history (distinct data source).
- **I (ClaudeKarma)** — **Peak-hours scheduling** + GitHub-style **usage heatmap** + gamified Karma levels; richest limit tracker.
- **J (Usage Meter)** — **Configurable refresh (1–60 min)** + any-% custom threshold + model auto-detect; clean single-purpose.
- **K (Token Track)** — **Multi-provider** (Claude/ChatGPT/Gemini/Grok/Perplexity) with **published accuracy %**; open source.
- **L (Tally)** — **Cross-LLM handoff** (export convo to other models w/ Markdown) and **the only paid tier**.
- **M (NeuraK)** — The outlier: counts **requests, not tokens**, via DOM, with manual session reset; oldest (Jan 2025).
