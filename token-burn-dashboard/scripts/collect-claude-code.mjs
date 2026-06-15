#!/usr/bin/env node
/**
 * collect-claude-code.mjs — turn local Claude Code logs into normalized rows.
 *
 * Reads the JSONL transcripts Claude Code writes under ~/.claude/projects, sums
 * exact per-turn token usage into the EXACT lane (`claude_code_tokens`), counts
 * meaningful sessions into `claude_code_calls`, and buckets everything by your
 * LOCAL day. Output matches the dashboard's three-lane row shape.
 *
 * Honesty: this script ONLY fills the exact lane. It never writes a chat
 * estimate, never invents activity counts, and tags every row it produces with
 * confidence "measured". Drivers, evidence, and chat lanes are yours to add.
 *
 * Usage:
 *   node scripts/collect-claude-code.mjs [--tz=America/New_York] \
 *        [--since=2026-05-01] [--include-cache] \
 *        [--merge=data/daily-burn.json] [--out=data/daily-burn.json]
 *
 *   --tz            IANA timezone that defines a "day" (default: system tz)
 *   --since         only count turns on/after this YYYY-MM-DD
 *   --include-cache also count cache_creation/cache_read tokens (default: off;
 *                   the kit counts input+output only)
 *   --merge         preserve driver/evidence/chat fields from an existing file,
 *                   per date, while refreshing the exact Claude Code numbers
 *   --out           where to write (default: prints JSON to stdout)
 *
 * Nothing here is sent anywhere. Run it on your own machine.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const TZ = args.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const SINCE = typeof args.since === 'string' ? args.since : null;
const INCLUDE_CACHE = !!args['include-cache'];
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const localDay = (ms) => (Number.isFinite(ms) ? dayFmt.format(new Date(ms)) : null);

async function listJsonl(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listJsonl(full)));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

function turnUsage(line) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  const u = obj?.message?.usage || obj?.usage;
  if (!u || typeof u !== 'object') return null;
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  let tokens = n(u.input_tokens) + n(u.output_tokens);
  if (INCLUDE_CACHE) tokens += n(u.cache_creation_input_tokens) + n(u.cache_read_input_tokens);
  const ts = obj?.timestamp || obj?.message?.timestamp || null;
  return { tokens, ts: ts ? Date.parse(ts) : NaN };
}

async function main() {
  try {
    await stat(PROJECTS_DIR);
  } catch {
    console.error(
      `No Claude Code logs at ${PROJECTS_DIR}. Set CLAUDE_CONFIG_DIR if yours lives elsewhere.`
    );
    process.exit(1);
  }

  const files = await listJsonl(PROJECTS_DIR);
  // day -> { tokens, sessions:Set }
  const byDay = new Map();

  for (const file of files) {
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      const t = turnUsage(line);
      if (!t || t.tokens <= 0) continue;
      const day = localDay(t.ts);
      if (!day) continue;
      if (SINCE && day < SINCE) continue;
      const acc = byDay.get(day) || { tokens: 0, sessions: new Set() };
      acc.tokens += t.tokens;
      acc.sessions.add(file); // one transcript file == one session
      byDay.set(day, acc);
    }
  }

  // Optional merge: keep human-authored fields from an existing data file.
  let prior = new Map();
  if (typeof args.merge === 'string') {
    try {
      const existing = JSON.parse(await readFile(args.merge, 'utf8'));
      for (const row of existing) prior.set(row.date, row);
    } catch (e) {
      console.error(`(merge skipped: could not read ${args.merge}: ${e.message})`);
    }
  }

  const rows = [...byDay.keys()].sort().map((date) => {
    const acc = byDay.get(date);
    const base = prior.get(date) || {};
    return {
      date,
      // EXACT lane (measured) — refreshed from logs
      codex_tokens: base.codex_tokens ?? 0,
      claude_code_tokens: acc.tokens,
      claude_code_calls: acc.sessions.size,
      api_tokens: base.api_tokens ?? 0,
      // ACTIVITY lane — preserved if present, never invented
      chatgpt_conversations: base.chatgpt_conversations ?? 0,
      chatgpt_messages: base.chatgpt_messages ?? 0,
      chatgpt_files: base.chatgpt_files ?? 0,
      claude_chat_conversations: base.claude_chat_conversations ?? 0,
      claude_chat_messages: base.claude_chat_messages ?? 0,
      // ESTIMATE lane — preserved if present, never invented here
      chat_tokens_low: base.chat_tokens_low ?? 0,
      chat_tokens_high: base.chat_tokens_high ?? 0,
      confidence: 'measured',
      // Metadata — yours to fill in
      driver: base.driver ?? 'unlabeled',
      evidence: base.evidence ?? '',
    };
  });

  // Carry forward prior dates that had no Claude Code activity today (e.g.
  // chat-only days) so a merge never deletes hand-authored history.
  if (prior.size) {
    for (const [date, row] of prior) {
      if (!byDay.has(date)) rows.push(row);
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  const json = JSON.stringify(rows, null, 2);
  if (typeof args.out === 'string') {
    await writeFile(args.out, json + '\n');
    const total = rows.reduce((s, r) => s + r.claude_code_tokens, 0);
    console.error(
      `Wrote ${rows.length} day(s) to ${args.out} — ${total.toLocaleString()} exact Claude Code tokens (tz=${TZ}${INCLUDE_CACHE ? ', incl. cache' : ''}).`
    );
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
