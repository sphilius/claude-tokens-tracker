---
name: token-burn-claude
description: Build a token-burn dashboard that separates exact measurements, activity counts, and labeled estimates into three visible lanes, combining exact Claude Code logs with measured Claude chat activity. Use when the user primarily works in Claude Code or Claude chat.
---

# Token Burn Dashboard For Claude

Use this skill when the user wants a dashboard centered on Claude usage.

## Workflow

1. Copy `assets/dashboard-starter/` into the user's chosen project folder.
2. Read `references/data-contract.md`, `references/dashboard-spec.md`, and `references/privacy-and-public-data.md`.
3. Read `references/source-notes.md` for Claude-specific collection and estimation guidance.
4. Aggregate Claude Code logs by local day into `claude_code_tokens`.
5. Pull Claude chat activity counts from the export into the activity lane.
6. If the user wants a token estimate for chat, write a band, never a single number.
7. Run the starter app locally and verify the views render.
8. Before deploy or sharing, scrub private evidence and keep raw logs and exports out of the app.

## Three-lane model

- **EXACT**: `claude_code_tokens`, `codex_tokens`, `api_tokens`. Measured logs only. The
  dashboard sums these into `exact_total`.
- **ACTIVITY**: `claude_chat_conversations`, `claude_chat_messages`, and the ChatGPT counts.
  Measured from exports, not tokens.
- **ESTIMATE**: `chat_tokens_low`, `chat_tokens_high`. Always a band, labeled with `confidence`.

Never merge exact and estimate into one total. The headline leads with Claude Code exact when it
dominates, and with activity when it does not.

## Collection Rules

- Claude Code logs at `~/.claude/projects/**/*.jsonl` record `usage.input_tokens` and
  `usage.output_tokens` per turn. Treat these as exact. This works on Pro and Max plans.
- Count meaningful Claude Code sessions into `claude_code_calls`.
- Claude chat has no token data. The export shows conversations, message text, timestamps, and
  attachments. Record the counts as activity. Estimate tokens only as a labeled band.
- Convert timestamps to the user's local day.

## Done Means

- `npm install` succeeds.
- `npm run build` succeeds.
- Claude Code exact and Claude chat activity appear in separate lanes.
- Estimates render as bands, not point values, and carry a `floor` or `rough` label.
- The user understands which numbers are measured and which are inferred.
