#!/usr/bin/env node
/**
 * claude-tokens-tracker — MCP companion server
 *
 * Exposes the shared core as MCP tools for Claude Desktop / agents:
 *   - estimate_tokens     count tokens for arbitrary text (offline)
 *   - estimate_cost       USD estimate from token counts + model
 *   - context_budget      tokens vs the 200k window, with headroom
 *   - get_account_usage   live session/weekly % (needs a session key)
 *   - get_claude_code_usage  per-project Claude Code spend from local logs
 *
 * It cannot see the live browser SSE stream (that's the userscript's job), so
 * account usage is fetched server-side from /usage using a session key you
 * provide via env. Token math reuses src/core verbatim.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { countTokens } from '../../src/core/tokenizer.js';
import {
  CONTEXT_LIMIT_TOKENS,
  pricingForModel,
  estimateInputCostUsd,
} from '../../src/core/limits.js';
import { parseUsageFromUsageEndpoint, formatResetCountdown } from '../../src/core/usage.js';
import { readClaudeCodeUsage } from './claude-code-usage.js';

// Opportunistically wire the exact o200k tokenizer if gpt-tokenizer is present,
// so the core's pluggable tokenizer returns exact counts in Node too.
try {
  const mod = await import('gpt-tokenizer/model/o200k_base');
  if (typeof mod.countTokens === 'function') {
    globalThis.GPTTokenizer_o200k_base = { countTokens: mod.countTokens };
  }
} catch {
  /* optional — falls back to the heuristic */
}

const text = (s) => ({ content: [{ type: 'text', text: s }] });
const json = (o) => ({ content: [{ type: 'text', text: JSON.stringify(o, null, 2) }] });

const server = new McpServer({ name: 'claude-tokens-tracker', version: '0.1.0' });

// --- estimate_tokens -------------------------------------------------------
server.registerTool(
  'estimate_tokens',
  {
    title: 'Estimate tokens',
    description:
      'Count tokens for a piece of text using o200k_base (exact if gpt-tokenizer is installed, heuristic otherwise). Approximates Claude; excludes the hidden system prompt.',
    inputSchema: { text: z.string().describe('Text to tokenize') },
  },
  async ({ text: input }) => {
    const tokens = countTokens(input);
    return json({ tokens, chars: input.length, exact: !!globalThis.GPTTokenizer_o200k_base });
  }
);

// --- estimate_cost ---------------------------------------------------------
server.registerTool(
  'estimate_cost',
  {
    title: 'Estimate cost',
    description:
      'Approximate USD cost for a number of input/output tokens at a model price. Prices are convenience estimates — verify against anthropic.com/pricing.',
    inputSchema: {
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative().default(0),
      model: z.string().default('sonnet').describe('e.g. "opus", "sonnet", "haiku"'),
    },
  },
  async ({ input_tokens, output_tokens, model }) => {
    const price = pricingForModel(model);
    const inputUsd = (input_tokens / 1_000_000) * price.input;
    const outputUsd = (output_tokens / 1_000_000) * price.output;
    return json({
      model,
      pricing_per_mtok: price,
      input_tokens,
      output_tokens,
      cost_usd: Math.round((inputUsd + outputUsd) * 10000) / 10000,
    });
  }
);

// --- context_budget --------------------------------------------------------
server.registerTool(
  'context_budget',
  {
    title: 'Context budget',
    description:
      'Given some text (or a token count), report how much of the 200k context window it uses and the remaining headroom.',
    inputSchema: {
      text: z.string().optional(),
      tokens: z.number().int().nonnegative().optional(),
      model: z.string().default('sonnet'),
    },
  },
  async ({ text: input, tokens, model }) => {
    const used = typeof tokens === 'number' ? tokens : countTokens(input || '');
    const pct = (used / CONTEXT_LIMIT_TOKENS) * 100;
    return json({
      used_tokens: used,
      limit_tokens: CONTEXT_LIMIT_TOKENS,
      used_pct: Math.round(pct * 10) / 10,
      remaining_tokens: Math.max(0, CONTEXT_LIMIT_TOKENS - used),
      approx_input_cost_usd: Math.round(estimateInputCostUsd(used, model) * 10000) / 10000,
    });
  }
);

// --- get_account_usage -----------------------------------------------------
server.registerTool(
  'get_account_usage',
  {
    title: 'Get account usage',
    description:
      'Live 5-hour session and 7-day weekly usage % with reset countdowns, read from claude.ai/usage. Requires CLAUDE_SESSION_KEY and CLAUDE_ORG_ID in the environment.',
    inputSchema: {},
  },
  async () => {
    const sessionKey = process.env.CLAUDE_SESSION_KEY;
    const orgId = process.env.CLAUDE_ORG_ID;
    if (!sessionKey || !orgId) {
      return text(
        'Account usage unavailable: set CLAUDE_SESSION_KEY (your claude.ai sessionKey cookie) and CLAUDE_ORG_ID (lastActiveOrg) in the server environment. Token/cost/Claude-Code tools work without them.'
      );
    }
    try {
      const res = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
        headers: { cookie: `sessionKey=${sessionKey}; lastActiveOrg=${orgId}` },
      });
      if (!res.ok) return text(`claude.ai returned HTTP ${res.status}. Is the session key current?`);
      const snapshot = parseUsageFromUsageEndpoint(await res.json());
      if (!snapshot) return text('Got a response but could not parse usage windows.');
      const fmt = (w) =>
        w
          ? { used_pct: Math.round(w.utilization * 10) / 10, resets_in: w.resets_at ? formatResetCountdown(Date.parse(w.resets_at)) : null }
          : null;
      return json({ session_5h: fmt(snapshot.five_hour), weekly_7d: fmt(snapshot.seven_day) });
    } catch (e) {
      return text(`Failed to reach claude.ai: ${e?.message || e}`);
    }
  }
);

// --- get_claude_code_usage -------------------------------------------------
server.registerTool(
  'get_claude_code_usage',
  {
    title: 'Get Claude Code usage',
    description:
      'Best-effort per-project Claude Code (CLI) token spend and approximate USD cost, read from local ~/.claude transcripts. Optionally limit to the last N days.',
    inputSchema: {
      days: z.number().int().positive().optional().describe('Only count turns from the last N days'),
    },
  },
  async ({ days }) => {
    const sinceMs = days ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
    const result = await readClaudeCodeUsage({ sinceMs });
    if (!result.available) {
      return text(`No Claude Code logs found at ${result.dir}. (Set CLAUDE_CONFIG_DIR to override.)`);
    }
    return json(result);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
