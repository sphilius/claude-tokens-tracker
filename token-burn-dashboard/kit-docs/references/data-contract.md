# Token Burn Data Contract

The dashboard reads one normalized JSON array from:

```text
assets/dashboard-starter/data/daily-burn.sample.json
```

When building for a user, copy that file to the starter app's `data/` folder and rename it only if you update the imports.

## Row shape (three-lane model)

```json
{
  "date": "2026-05-24",

  "codex_tokens": 184320,
  "claude_code_tokens": 512880,
  "claude_code_calls": 47,
  "api_tokens": 0,

  "chatgpt_conversations": 8,
  "chatgpt_messages": 42,
  "chatgpt_files": 2,
  "claude_chat_conversations": 3,
  "claude_chat_messages": 18,

  "chat_tokens_low": 24000,
  "chat_tokens_high": 38000,
  "confidence": "floor",

  "driver": "shipping",
  "evidence": "local sanitized note"
}
```

## The three lanes

1. **EXACT** (`codex_tokens`, `claude_code_tokens`, `api_tokens`). Measured token logs only.
   The dashboard sums these into `exact_total`. Estimates never enter this lane.
2. **ACTIVITY** (`chatgpt_conversations`, `chatgpt_messages`, `chatgpt_files`,
   `claude_chat_conversations`, `claude_chat_messages`). Counts you actually measured from a
   chat export. These are not tokens.
3. **ESTIMATE** (`chat_tokens_low`, `chat_tokens_high`). Always a band, never a single number.
   `confidence` is `"measured"`, `"floor"`, or `"rough"`.

## Adaptive headline rule

The dashboard leads with whatever is actually measured.

- Exact-dominant data leads with `exact_total`.
- Activity-dominant or chat-only data leads with conversation and message counts, and demotes
  the token figure to a labeled band.
- Estimate-only data leads with the band, labeled as a rough estimate.

## Rules

- Bucket dates in the user's local working timezone before aggregating.
- `exact_total` is computed from the exact lane only. Do not store it. Do not fold estimates in.
- Keep `driver` labels short and boring. shipping, research, review, video, planning, admin,
  support, writing.
- `evidence` explains why a day spiked. Public evidence must be scrubbed.
- Never include raw logs, chat exports, client names, private project IDs, file paths, emails,
  or secrets in the starter app.

## Backward compatibility

Old rows used `total`, `claude_chat_est`, and `chatgpt_est`. Those fields are deprecated. The
loader migrates a legacy point estimate into a band (`chat_tokens_low` plus a conservative
`chat_tokens_high`). Do not write the deprecated fields in new data.

## Never claim

- Do not sum exact plus estimate into one number and present it as a uniform total.
- Do not render an estimate as a point value. Use a band.
- Do not call chat usage "measured" unless exact provider logs exist.
- Do not convert tokens into "novel equivalents" or other fermi math on mixed or estimated data.
- Do not hide the fidelity label. The label is part of the number.
