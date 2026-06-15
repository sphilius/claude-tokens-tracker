# claude-tokens-tracker — MCP companion

An MCP server that exposes the shared core as tools for Claude Desktop (or any
MCP client). It complements the userscript: the userscript owns the live
in-browser view; this owns **programmatic token/cost math** and the
**Claude Code (CLI) per-project spend** surface that browser extensions can't reach.

## Tools

| Tool | Needs | What it does |
|---|---|---|
| `estimate_tokens` | — | Token count for any text (exact o200k if `gpt-tokenizer` is installed, else heuristic). |
| `estimate_cost` | — | USD estimate from input/output tokens + model. |
| `context_budget` | — | Text/token count → % of the 200k window + headroom. |
| `get_account_usage` | session key (env) | Live 5h session + 7d weekly % with reset countdowns from `/usage`. |
| `get_claude_code_usage` | local `~/.claude` | Per-project Claude Code token spend + approx $ cost. |

> ⚠️ An MCP server can't see the live browser SSE stream, so `get_account_usage`
> fetches `/usage` server-side using a session key **you** provide. Prices are
> convenience estimates — verify against anthropic.com/pricing.

## Install & run

```
cd adapters/mcp
npm install                 # @modelcontextprotocol/sdk + zod (+ optional gpt-tokenizer)
node server.js              # speaks MCP over stdio
```

## Register in Claude Desktop

Add to `claude_desktop_config.json` (Settings → Developer → Edit Config):

```jsonc
{
  "mcpServers": {
    "claude-tokens-tracker": {
      "command": "node",
      "args": ["/absolute/path/to/claude-tokens-tracker/adapters/mcp/server.js"],
      "env": {
        // optional — only needed for get_account_usage:
        "CLAUDE_SESSION_KEY": "sk-ant-sid01-...",   // your claude.ai sessionKey cookie
        "CLAUDE_ORG_ID": "your-lastActiveOrg-uuid"
      }
    }
  }
}
```

### Getting the session key (optional)
On claude.ai while logged in: DevTools → Application → Cookies → copy the
`sessionKey` value and the `lastActiveOrg` value. These stay in your local
Claude Desktop config; the server only sends them to `claude.ai`. Token, cost,
context, and Claude Code tools all work **without** them.

### Claude Code usage
`get_claude_code_usage` reads transcripts under `~/.claude/projects` (override
with `CLAUDE_CONFIG_DIR`). It's best-effort — it sums whatever `message.usage`
fields it recognises and degrades gracefully if Claude Code changes its format.

MIT. Reuses `../../src/core`. See repo `THIRD_PARTY_NOTICES.md`.
