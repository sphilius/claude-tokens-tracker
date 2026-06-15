# Third-Party Notices & Attribution

claude-tokens-tracker reuses ideas and small amounts of logic from the
following MIT-licensed projects. Where their code was adapted, the relevant
source files note it inline.

## gpt-tokenizer (`o200k_base`) — MIT, © 2023–2024 Bazyli Brzoska

- **Used for:** exact token counting when the global `GPTTokenizer_o200k_base`
  is present (vendored in the planned MV3 build, or loaded via the optional
  userscript `@require`). The userscript's default heuristic does **not**
  bundle this code.
- **Project:** https://github.com/niieani/gpt-tokenizer

```
MIT License

Copyright (c) 2023-2024 Bazyli Brzoska

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## she-llac/claude-counter — MIT, © 2025 Claude Counter contributors

- **Adapted for:** the verified data-source mechanism — reading
  `/api/organizations/{org}/usage`, parsing the live SSE `message_limit`
  frames for unrounded utilization, and reconstructing the active-branch token
  trunk (`src/core/conversation.js`, `src/core/usage.js`, `src/core/net.js`).
- **Project:** https://github.com/she-llac/claude-counter

## lugia19/Claude-Usage-Extension — source-available upstream

- **Credited for:** the original Claude usage-tracking approach (per-source
  token accounting; optional Anthropic API key for exact counts) that the
  above and this project follow.
- **Project:** https://github.com/lugia19/Claude-Usage-Extension

---

Not affiliated with Anthropic. "Claude" is a trademark of Anthropic.
