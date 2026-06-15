/**
 * claude-tokens-tracker — Claude Code usage reader (Node-only)
 *
 * Best-effort aggregation of Claude *Code* (CLI) token spend from local
 * session transcripts under ~/.claude/projects/<project>/<session>.jsonl.
 *
 * This is the surface the browser tools don't cover (cf. the survey's tool N).
 * Schemas are read defensively: Claude Code records assistant turns whose
 * `message.usage` carries input/output and cache token counts. We sum whatever
 * is present and skip anything we don't recognise, so a format drift degrades
 * gracefully to partial/empty numbers rather than throwing.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { estimateInputCostUsd, pricingForModel } from '../../src/core/limits.js';

const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

/** Recursively list *.jsonl transcript files under the projects dir. */
async function listTranscripts(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listTranscripts(full)));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

/** Pull a usage record out of a transcript line, tolerant of shape. */
function usageFromLine(line) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return null;
  }
  const usage = obj?.message?.usage || obj?.usage;
  if (!usage || typeof usage !== 'object') return null;
  const model = obj?.message?.model || obj?.model || null;
  const ts = obj?.timestamp || obj?.message?.timestamp || null;
  const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    model,
    ts: ts ? Date.parse(ts) : null,
    input: num(usage.input_tokens),
    output: num(usage.output_tokens),
    cacheCreate: num(usage.cache_creation_input_tokens),
    cacheRead: num(usage.cache_read_input_tokens),
  };
}

/** Project label from a transcript path (the directory under projects/). */
function projectOf(path) {
  const rel = path.slice(PROJECTS_DIR.length + 1);
  const seg = rel.split(/[\\/]/)[0] || 'unknown';
  // Claude Code encodes the cwd with dashes; show it as-is (decoded-ish).
  return seg.replace(/^-/, '/').replace(/-/g, '/');
}

/**
 * Aggregate Claude Code spend.
 * @param {Object} [opts]
 * @param {number} [opts.sinceMs] only count turns at/after this epoch ms
 * @returns {Promise<{available:boolean, dir:string, totals:object, byProject:object[]}>}
 */
export async function readClaudeCodeUsage({ sinceMs = null } = {}) {
  let dirOk = true;
  try {
    await stat(PROJECTS_DIR);
  } catch {
    dirOk = false;
  }
  if (!dirOk) {
    return { available: false, dir: PROJECTS_DIR, totals: emptyTotals(), byProject: [] };
  }

  const files = await listTranscripts(PROJECTS_DIR);
  const projects = new Map(); // name -> totals

  for (const file of files) {
    let content;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const name = projectOf(file);
    const acc = projects.get(name) || emptyTotals();
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      const u = usageFromLine(line);
      if (!u) continue;
      if (sinceMs && u.ts && u.ts < sinceMs) continue;
      acc.input += u.input;
      acc.output += u.output;
      acc.cacheCreate += u.cacheCreate;
      acc.cacheRead += u.cacheRead;
      acc.turns += 1;
      // cost: input+cache as input-priced, output as output-priced
      const price = pricingForModel(u.model);
      acc.costUsd +=
        ((u.input + u.cacheCreate + u.cacheRead) / 1_000_000) * price.input +
        (u.output / 1_000_000) * price.output;
    }
    projects.set(name, acc);
  }

  const totals = emptyTotals();
  const byProject = [];
  for (const [name, t] of projects) {
    if (t.turns === 0) continue;
    byProject.push({ project: name, ...round(t) });
    for (const k of Object.keys(totals)) totals[k] += t[k];
  }
  byProject.sort((a, b) => b.costUsd - a.costUsd);

  return { available: true, dir: PROJECTS_DIR, totals: round(totals), byProject };
}

function emptyTotals() {
  return { turns: 0, input: 0, output: 0, cacheCreate: 0, cacheRead: 0, costUsd: 0 };
}
function round(t) {
  return { ...t, costUsd: Math.round(t.costUsd * 10000) / 10000 };
}

/** Re-export so the server can show a single-number cost if asked. */
export { estimateInputCostUsd };
