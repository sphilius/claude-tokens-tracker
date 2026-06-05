# Claude Source Notes

Claude usage has two paths with very different fidelity. Claude Code is exact. Claude chat is not.

## Claude Code (exact)

Claude Code writes a JSONL transcript per session under `~/.claude/projects/**/*.jsonl`. Every
assistant turn carries a `usage` object with `input_tokens`, `output_tokens`, and cache fields.
These are exact and local, and they are present on Pro and Max plans, not just API keys. The
`ccusage` tool reads these same files.

Collect and normalize:

- Convert timestamps to the user's local day.
- Sum exact token usage into `claude_code_tokens` with `confidence: "measured"`.
- Count meaningful sessions into `claude_code_calls`.
- Watch the cleanup window. Claude Code can prune old JSONL after `cleanupPeriodDays`, default 30.
  Raise it or ingest nightly if you want long history.

## Claude chat (activity, then a labeled estimate)

Claude chat has no token data. The claude.ai export shows conversations, message text,
timestamps, and attachments, and no token counts.

- Put the measured counts in the activity lane. `claude_chat_conversations`,
  `claude_chat_messages`.
- If the user wants a token figure, write a band into `chat_tokens_low` and `chat_tokens_high`
  with `confidence: "floor"`. Never write a single number, and never call it measured.

The dashboard headline leads with Claude Code exact when it dominates, and with activity when it
does not.
