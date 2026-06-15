#!/usr/bin/env node
/**
 * scrub-public.mjs — produce the deployable dataset from your private one.
 *
 * Reads your private working file (full evidence) and writes a scrubbed public
 * file the app renders/deploys. It emits ONLY the known-safe fields and replaces
 * the free-text `evidence` with generic work-family language, so private detail
 * (client names, ticket IDs, paths, prompts) can never leak into a deploy.
 *
 * Usage:
 *   node scripts/scrub-public.mjs [--in=data/daily-burn.local.json] \
 *        [--out=data/daily-burn.json] [--blank-evidence]
 *
 *   --in             private source (default: data/daily-burn.local.json)
 *   --out            public target the app imports (default: data/daily-burn.json)
 *   --blank-evidence drop evidence entirely instead of a generic phrase
 *
 * The token numbers themselves are safe to publish; only evidence is rewritten.
 */

import { readFile, writeFile } from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const IN = typeof args.in === 'string' ? args.in : 'data/daily-burn.local.json';
const OUT = typeof args.out === 'string' ? args.out : 'data/daily-burn.json';
const BLANK = !!args['blank-evidence'];

// Only these fields ever reach the public file. Anything else is dropped.
const SAFE_KEYS = [
  'date',
  'codex_tokens',
  'claude_code_tokens',
  'claude_code_calls',
  'api_tokens',
  'chatgpt_conversations',
  'chatgpt_messages',
  'chatgpt_files',
  'claude_chat_conversations',
  'claude_chat_messages',
  'chat_tokens_low',
  'chat_tokens_high',
  'confidence',
  'driver',
];

// Boring, safe, work-family phrasing keyed off the (already-generic) driver.
const DRIVER_PHRASE = {
  shipping: 'shipping and review',
  research: 'research and reading',
  review: 'review and correction',
  video: 'video production',
  planning: 'planning and scoping',
  writing: 'writing and editing',
  support: 'support and triage',
  admin: 'admin and upkeep',
};

async function main() {
  let rows;
  try {
    rows = JSON.parse(await readFile(IN, 'utf8'));
  } catch (e) {
    console.error(`Could not read ${IN}: ${e.message}`);
    console.error('Tip: build your private file first with the collect-* scripts.');
    process.exit(1);
  }
  if (!Array.isArray(rows)) {
    console.error(`${IN} is not a JSON array of rows.`);
    process.exit(1);
  }

  const scrubbed = rows.map((row) => {
    const out = {};
    for (const key of SAFE_KEYS) if (key in row) out[key] = row[key];
    const driver = String(row.driver || 'unlabeled').toLowerCase();
    out.evidence = BLANK ? '' : DRIVER_PHRASE[driver] || `${driver} work`;
    return out;
  });

  await writeFile(OUT, JSON.stringify(scrubbed, null, 2) + '\n');
  console.error(
    `Scrubbed ${scrubbed.length} row(s): ${IN} -> ${OUT}. Evidence replaced with generic phrasing` +
      `${BLANK ? ' (blanked)' : ''}. Review ${OUT} before deploying.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
