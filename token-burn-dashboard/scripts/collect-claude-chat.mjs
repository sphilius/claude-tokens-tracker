#!/usr/bin/env node
/**
 * collect-claude-chat.mjs — turn a claude.ai export into the ACTIVITY lane plus
 * a labeled FLOOR band. Claude chat exposes no token counts, so this NEVER
 * writes a measured token figure for chat.
 *
 * Input: the `conversations.json` from your claude.ai data export
 *   (Settings -> Privacy -> Export data). The export has conversations, each
 *   with chat_messages carrying text + created_at. No tokens.
 *
 * What it writes per local day:
 *   - claude_chat_conversations, claude_chat_messages  (MEASURED activity)
 *   - chat_tokens_low / chat_tokens_high               (FLOOR band, an estimate)
 *
 * Floor logic: `low` = visible message text / ~4 chars-per-token. That is a true
 * floor — your real burn is at least the text you can see, and almost certainly
 * more once hidden system prompt and resent context are added, which we can't
 * measure. `high` = low x --high-mult (default 3) to acknowledge that gap. The
 * band is labeled, never a single number.
 *
 * confidence: a day keeps "measured" if it already has exact tokens (from the
 * Claude Code collector via --merge); otherwise it is "floor".
 *
 * Usage:
 *   node scripts/collect-claude-chat.mjs --export=~/Downloads/conversations.json \
 *        --tz=America/New_York --merge=data/daily-burn.local.json \
 *        --out=data/daily-burn.local.json [--high-mult=3] [--chars-per-token=4]
 *
 * Runs locally. Nothing is sent anywhere. The export is raw/private — keep it
 * out of the app and out of git.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const expand = (p) => (p && p.startsWith('~') ? p.replace(/^~/, homedir()) : p);
const EXPORT = expand(args.export);
const TZ = args.tz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const HIGH_MULT = Number(args['high-mult'] ?? 3) || 3;
const CPT = Number(args['chars-per-token'] ?? 4) || 4;

if (!EXPORT) {
  console.error('Pass --export=/path/to/conversations.json (from your claude.ai data export).');
  process.exit(1);
}

const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const localDay = (v) => {
  const ms = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(ms) ? dayFmt.format(new Date(ms)) : null;
};

/** Pull readable text out of a message across the formats Claude exports use. */
function messageText(msg) {
  if (typeof msg?.text === 'string' && msg.text) return msg.text;
  const parts = Array.isArray(msg?.content) ? msg.content : [];
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .filter(Boolean)
    .join(' ');
}

async function main() {
  let convos;
  try {
    convos = JSON.parse(await readFile(EXPORT, 'utf8'));
  } catch (e) {
    console.error(`Could not read export at ${EXPORT}: ${e.message}`);
    process.exit(1);
  }
  if (!Array.isArray(convos)) {
    console.error('Unexpected export shape: expected a top-level array of conversations.');
    process.exit(1);
  }

  // day -> { messages, chars, convoIds:Set }
  const byDay = new Map();
  for (const convo of convos) {
    const msgs = Array.isArray(convo?.chat_messages) ? convo.chat_messages : [];
    const convoId = convo?.uuid || convo?.id || JSON.stringify(convo?.name);
    for (const msg of msgs) {
      const day = localDay(msg?.created_at || convo?.created_at);
      if (!day) continue;
      const acc = byDay.get(day) || { messages: 0, chars: 0, convoIds: new Set() };
      acc.messages += 1;
      acc.chars += messageText(msg).length;
      acc.convoIds.add(convoId);
      byDay.set(day, acc);
    }
  }

  // Merge base (preserve the exact lane + drivers/evidence already collected).
  const prior = new Map();
  if (typeof args.merge === 'string') {
    try {
      for (const row of JSON.parse(await readFile(args.merge, 'utf8'))) prior.set(row.date, row);
    } catch (e) {
      console.error(`(merge skipped: ${e.message})`);
    }
  }

  const dates = new Set([...byDay.keys(), ...prior.keys()]);
  const rows = [...dates].sort().map((date) => {
    const base = prior.get(date) || {};
    const acc = byDay.get(date);
    const low = acc ? Math.ceil(acc.chars / CPT) : Number(base.chat_tokens_low) || 0;
    const high = acc ? Math.ceil(low * HIGH_MULT) : Number(base.chat_tokens_high) || 0;
    const exact =
      (Number(base.claude_code_tokens) || 0) +
      (Number(base.api_tokens) || 0) +
      (Number(base.codex_tokens) || 0);
    const confidence = exact > 0 ? 'measured' : low > 0 ? 'floor' : base.confidence || 'rough';
    return {
      date,
      codex_tokens: base.codex_tokens ?? 0,
      claude_code_tokens: base.claude_code_tokens ?? 0,
      claude_code_calls: base.claude_code_calls ?? 0,
      api_tokens: base.api_tokens ?? 0,
      chatgpt_conversations: base.chatgpt_conversations ?? 0,
      chatgpt_messages: base.chatgpt_messages ?? 0,
      chatgpt_files: base.chatgpt_files ?? 0,
      claude_chat_conversations: acc ? acc.convoIds.size : base.claude_chat_conversations ?? 0,
      claude_chat_messages: acc ? acc.messages : base.claude_chat_messages ?? 0,
      chat_tokens_low: low,
      chat_tokens_high: high,
      confidence,
      driver: base.driver ?? 'unlabeled',
      evidence: base.evidence ?? '',
    };
  });

  const json = JSON.stringify(rows, null, 2);
  if (typeof args.out === 'string') {
    await writeFile(args.out, json + '\n');
    const msgs = [...byDay.values()].reduce((s, d) => s + d.messages, 0);
    console.error(
      `Wrote ${rows.length} day(s) to ${args.out} — ${msgs} Claude chat messages as activity, with a labeled floor band (tz=${TZ}, high x${HIGH_MULT}).`
    );
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
