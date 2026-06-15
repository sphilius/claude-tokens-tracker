/**
 * @claude-tokens-tracker/core — limits.js
 *
 * Static facts about Claude's context window, prompt cache, and (approximate)
 * model pricing. No DOM, no network — safe to import from any adapter
 * (userscript, MV3 extension, MCP companion).
 */

/** Claude.ai per-conversation context window, in tokens. */
export const CONTEXT_LIMIT_TOKENS = 200_000;

/**
 * How long a conversation stays in Claude's prompt cache after the last
 * assistant message. Continuing within this window is cheaper.
 * (5 minutes — matches the observed claude.ai behaviour.)
 */
export const CACHE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Approximate published list prices, USD per 1M tokens.
 *
 * ⚠️ These are a convenience estimate only and drift as Anthropic updates
 * pricing — verify against https://www.anthropic.com/pricing before relying
 * on the $ figure. Keys are matched loosely (case-insensitive substring) to
 * whatever model string claude.ai exposes.
 */
export const MODEL_PRICING = Object.freeze({
  opus: { input: 15, output: 75 },
  sonnet: { input: 3, output: 15 },
  haiku: { input: 0.8, output: 4 },
});

/** Fallback when the model can't be identified. */
const DEFAULT_PRICING = MODEL_PRICING.sonnet;

/**
 * Resolve a pricing entry from a free-form model label (e.g. "Opus 4.5").
 * @param {string|null|undefined} modelLabel
 */
export function pricingForModel(modelLabel) {
  const label = String(modelLabel || '').toLowerCase();
  for (const key of Object.keys(MODEL_PRICING)) {
    if (label.includes(key)) return MODEL_PRICING[key];
  }
  return DEFAULT_PRICING;
}

/**
 * Rough cost of a number of context tokens treated as input, in USD.
 * Output tokens are billed separately; this is a lower-bound "what this
 * context costs to send once" estimate.
 * @param {number} tokens
 * @param {string|null} [modelLabel]
 */
export function estimateInputCostUsd(tokens, modelLabel) {
  const price = pricingForModel(modelLabel);
  return (Math.max(0, tokens) / 1_000_000) * price.input;
}
