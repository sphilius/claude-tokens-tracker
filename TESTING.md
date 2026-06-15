# Live test checklist (personal use)

Pick the surface(s) you'll actually use. The **userscript** is the lead and the
quickest to verify — it needs no build and works on desktop and Android.

## A. Userscript (recommended first)

1. Install Tampermonkey (or Violentmonkey) in your browser.
2. Open `dist/claude-tokens-tracker.user.js` from this repo (or its raw GitHub
   URL) — the userscript manager offers to install it. Accept.
   - On install it fetches the `@require` gpt-tokenizer bundle once (for exact
     counts). If you'd rather not, delete the `@require` line before installing.
3. Open <https://claude.ai> and a conversation. A small panel appears
   **bottom-right**.

Confirm, in the panel:
- [ ] **Context**: a token count and % of 200k that *rises as the thread grows*
      (open a long chat to see it move). Shows `exact` not `~` when the
      `@require` loaded.
- [ ] **Session / Weekly**: unrounded % with a reset countdown. These populate
      after the first network call — send a message if blank.
- [ ] **Cache**: a 5-minute countdown that (re)starts after each assistant reply.
- [ ] Nothing leaves your browser (Network tab shows no third-party calls
      beyond claude.ai; the one CDN fetch was install-time only).

## B. MV3 extension (desktop Chrome/Edge)

The committed `extension/content.js` uses the heuristic. For **exact** counts,
build it first (optional):

```
npm install            # repo root (gets esbuild)
npm i gpt-tokenizer    # optional, for exact counts in the extension
npm run build:extension
```

Then: `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
select the `extension/` folder. Open claude.ai and check the same panel as above.

## C. MCP companion (Claude Desktop)

```
cd adapters/mcp
npm install
node server.js         # should start and wait on stdio (Ctrl-C to stop)
```

Register it (see `adapters/mcp/README.md`), restart Claude Desktop, then in a
chat:
- [ ] `estimate_tokens` / `estimate_cost` / `context_budget` return numbers.
- [ ] `get_claude_code_usage` lists your projects (if you've used Claude Code).
- [ ] `get_account_usage` works only after you set `CLAUDE_SESSION_KEY` +
      `CLAUDE_ORG_ID` in the server env (optional).

## If something's off
Tell me which check failed and what you saw (a screenshot of the panel +
DevTools Console errors is ideal). The likely suspects are the claude.ai DOM
selector or the `/usage` JSON shape changing — both are isolated in
`src/core/` and quick to patch.
