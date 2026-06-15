/**
 * @claude-tokens-tracker/core — tokenizer.js
 *
 * Pluggable token counter. Prefers the exact `o200k_base` tokenizer from
 * gpt-tokenizer (MIT, by Bazyli Brzoska) when it has been made available as
 * the global `GPTTokenizer_o200k_base` (vendored in the MV3 build, or loaded
 * via an optional `@require` in the userscript). When it's absent we fall
 * back to a fast heuristic so the tool still works with zero external deps.
 *
 * o200k_base is the GPT-4o/o200k tokenizer. Claude uses its own tokenizer, so
 * even the "exact" path is an approximation of Claude's true count — but it's
 * close and stable, which is what the field uses. Counts exclude the hidden
 * system prompt, so they read slightly low vs Claude's internal number.
 */

/** @returns {{ countTokens(text: string): number } | null} */
function exactTokenizer() {
  const t = /** @type {any} */ (globalThis).GPTTokenizer_o200k_base;
  return t && typeof t.countTokens === 'function' ? t : null;
}

/**
 * Heuristic fallback. Empirically o200k averages ~3.7 chars/token on English
 * prose and far fewer on code/punctuation, so we blend a char-based and a
 * word/symbol-based estimate and take the larger (token counts are rarely
 * lower than the word count).
 * @param {string} text
 */
function heuristicCount(text) {
  if (!text) return 0;
  const chars = text.length;
  const byChars = chars / 3.7;
  // Count word-ish runs and standalone symbols; each tends to be ≥1 token.
  const pieces = text.match(/[A-Za-z0-9]+|[^\sA-Za-z0-9]/g);
  const byPieces = pieces ? pieces.length : 0;
  return Math.ceil(Math.max(byChars, byPieces));
}

/** True when exact o200k counting is active. Useful for UI ("~" vs exact). */
export function isExactTokenizerAvailable() {
  return exactTokenizer() != null;
}

/**
 * Count tokens for a string. Never throws.
 * @param {string} text
 * @returns {number}
 */
export function countTokens(text) {
  if (!text) return 0;
  const exact = exactTokenizer();
  if (exact) {
    try {
      return exact.countTokens(text);
    } catch {
      /* fall through to heuristic */
    }
  }
  return heuristicCount(text);
}
