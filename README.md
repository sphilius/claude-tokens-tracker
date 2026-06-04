# claude-tokens-tracker

A personal, **local-only** tracker for Claude.ai token & usage — a shared core
library with thin delivery adapters. The **userscript** is the lead vehicle
because it's the single codebase that covers Windows desktop **and** the
Android path (where Chrome supports no extensions); an MV3 extension and an
MCP companion are planned next.

> Not affiliated with Anthropic. All counting happens in your browser; the only
> network call is reading **your own** `/usage` via your existing claude.ai
> session. No servers, no telemetry, no third parties.

## What it shows (v0.1)

- **Context** — approximate token count for the active conversation vs the
  200k window (exact with the optional o200k tokenizer; heuristic otherwise).
- **Session (5h)** and **Weekly (7d)** usage — **unrounded** percentages with
  live reset countdowns, read from claude.ai's own `/usage` endpoint and live
  SSE `message_limit` frames (more precise than the rounded settings page).
- **Cache timer** — how long the conversation stays in Claude's prompt cache.

Roadmap (from the tool survey): threshold **alerts**, **JSON export**, and
**burn-rate** prediction — the features that the field's 14 store tools mostly
*lack* (see `REPORT-v2-store-listings-verified.md` and
`FEATURE-MATRIX-store-verified.md`).

## Install (userscript)

1. Install a userscript manager — Tampermonkey or Violentmonkey (desktop), or
   on Android a userscript-capable browser (Kiwi, Firefox-Android + an add-on,
   Orion).
2. Add **`dist/claude-tokens-tracker.user.js`** (open the raw file; the manager
   offers to install). It's a checked-in build for one-click install.
3. Open claude.ai — a small panel appears bottom-right.

**Exact token counts (optional):** add this line inside the script's
`==UserScript==` block to load the MIT gpt-tokenizer once at install time:

```
// @require https://cdn.jsdelivr.net/npm/gpt-tokenizer@2/dist/o200k_base.js
```

Without it, the context count uses a built-in heuristic (shown with a `~`).

## Repository layout

```
src/core/                 Shared, framework-agnostic library (no DOM/UI)
  limits.js               Context limit, cache window, approx pricing
  tokenizer.js            Pluggable o200k / heuristic token counter
  usage.js                /usage + SSE message_limit parsing, countdowns
  conversation.js         Active-branch token + cache-expiry metrics
  net.js                  Org/conversation helpers + fetch interceptor
  index.js                Public exports
adapters/userscript/      Thin userscript surface (DOM panel + bootstrap)
  main.js                 Imports core, renders the panel
  header.txt              ==UserScript== metadata
adapters/mcp/             MCP companion server (Claude Desktop / agents)
  server.js               Tools: estimate_tokens/cost, context_budget, usage
  claude-code-usage.js    Per-project Claude Code spend from ~/.claude logs
build/build-userscript.mjs  esbuild bundler → dist/*.user.js
dist/                     Checked-in built userscript (installable)
```

Delivery surfaces, by status: **userscript** (v0.1, lead) → **MCP companion**
(v0.1, `adapters/mcp/`) → **MV3 extension** (planned). No Skill is planned.

## Build from source

```
npm install
npm run build:userscript   # regenerates dist/claude-tokens-tracker.user.js
```

The committed `dist/` file is the bundled output; edit `src/` + `adapters/` and
rebuild rather than editing `dist/` directly.

## Credits / license

MIT. Token, usage, and SSE logic adapted (MIT) from
[`she-llac/claude-counter`](https://github.com/she-llac/claude-counter) and
[`lugia19/Claude-Usage-Extension`](https://github.com/lugia19/Claude-Usage-Extension);
exact counting via [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer)
(`o200k_base`, MIT). Full notices in `THIRD_PARTY_NOTICES.md`.
