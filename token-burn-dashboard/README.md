# Token-Burn Dashboard (Claude)

A local dashboard for where your AI usage goes. Built from the SHA-verified
`token-burn-claude` starter kit (Next.js 16 / React 19, dependency-light).

It keeps three lanes visibly separate and **never** sums a guess into a measured
number:

- **EXACT** — `claude_code_tokens`, `api_tokens`. Measured logs only → `exact_total`.
- **ACTIVITY** — `claude_chat_conversations`, `claude_chat_messages`. Measured
  counts from your export, not tokens.
- **ESTIMATE** — `chat_tokens_low`/`chat_tokens_high`, a labeled **floor band**.
  Never a single number, never called "measured".

A persistent fidelity legend (measured / floor / rough) stays visible, and every
number carries its label.

> Configured for: **Claude Code + API** (exact) and **Claude chat** (activity +
> floor band). Timezone **America/New_York**. Codex column trimmed out.

## Provenance
Vendored from `token-burn-claude-skill.zip`, SHA-256
`4309b8b10bd32b495846a9f4dbf24d1b6891f8c81f234c7e491a5dcd3b21bca9` — verified
against the published manifest. Original kit docs are in `kit-docs/`.

## Run it

```bash
npm install
npm run build      # verified: compiles, type-checks, static-generates
npm run dev        # http://localhost:3000
```

Out of the box it renders the kit's sample data so every view is populated.

## Put YOUR data in (3 steps)

Your real numbers live on your machine. The app reads `data/daily-burn.json`
(the public/deployable file). Build it from a **private** working file that git
ignores (`data/daily-burn.local.json`).

**1. Exact Claude Code tokens** (and API, if you add them by hand):

```bash
node scripts/collect-claude-code.mjs \
  --tz=America/New_York \
  --merge=data/daily-burn.local.json \
  --out=data/daily-burn.local.json
```

Reads `~/.claude/projects/**/*.jsonl`, sums `input+output` tokens per turn by
local day, counts sessions, tags rows `measured`. Add `--include-cache` to also
count cache tokens. (`CLAUDE_CONFIG_DIR=...` if your logs live elsewhere.)

**2. Claude chat activity + floor band** (optional — needs a claude.ai export
from Settings → Privacy → Export data):

```bash
node scripts/collect-claude-chat.mjs \
  --export=~/Downloads/conversations.json \
  --tz=America/New_York \
  --merge=data/daily-burn.local.json \
  --out=data/daily-burn.local.json
```

Writes measured conversation/message counts plus a `floor` token band. A day
that already has exact tokens stays `measured`; chat-only days become `floor`.

**3. Label drivers, then scrub for the app:**

Open `data/daily-burn.local.json` and set each day's `driver` (shipping,
research, review, video, planning, writing, support, admin) and a private
`evidence` note. Then generate the scrubbed file the app renders:

```bash
node scripts/scrub-public.mjs \
  --in=data/daily-burn.local.json \
  --out=data/daily-burn.json        # add --blank-evidence to drop notes entirely
```

Scrubbing emits only safe fields and replaces `evidence` free-text with generic
work-family phrasing, so client names / ticket IDs / paths can't leak.

## Add the next day of data
Re-run step 1 (and step 2 if you chat) with the same `--merge`/`--out` pointing
at `data/daily-burn.local.json` — they refresh today's row and preserve your
existing drivers, evidence, and other lanes. Add a driver/evidence for the new
day, then re-run step 3. Refresh the browser.

## Deploy (only after scrubbing)
`data/daily-burn.json` is the only data that ships. Confirm it's scrubbed
(generic evidence, no private fields), then build the static site:

```bash
npm run build      # static export is enabled -> emits a portable out/ folder
```

`out/` is a plain static site — host it anywhere (GitHub Pages, Netlify, S3) or
preview locally with `npx serve out`. **Do not deploy until you've eyeballed
`data/daily-burn.json`.**

## Privacy guarantees
- `data/daily-burn.local.json` and `*.private.json` are git-ignored.
- Raw `~/.claude` logs and the claude.ai export never enter the app.
- The collectors run entirely locally; nothing is sent anywhere.

## Honesty rules (enforced by the data + UI)
- Exact and estimate are never summed into one "total".
- Estimates always render as a band, never a point value.
- Chat is never labeled "measured" unless that day has exact provider logs.
- The fidelity label is part of every number.
