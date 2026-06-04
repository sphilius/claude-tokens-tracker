/**
 * Bundles the SAME userscript adapter + core into the MV3 extension's
 * MAIN-world content script. The adapter runs identically in a userscript and
 * in a `world: "MAIN"` content script (both are page context), so there is one
 * source of truth (adapters/userscript/main.js) and two build targets.
 *
 * If `gpt-tokenizer` is installed (it's an optional dep of adapters/mcp, or
 * `npm i gpt-tokenizer` at the repo root), it is bundled directly into
 * content.js so the extension gets EXACT o200k counts with no runtime CDN
 * fetch. Otherwise the bundle ships with the built-in heuristic.
 *
 * Usage: node build/build-extension.mjs   (or: npm run build:extension)
 */
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'adapters/userscript/main.js');
const outFile = resolve(root, 'extension/content.js');

// Detect the optional exact tokenizer and, if present, inject a side-effect
// prelude that wires it to the global the core's tokenizer looks for.
let inject = [];
let tokenizerNote = 'heuristic (install gpt-tokenizer for exact counts)';
try {
  await import('gpt-tokenizer/model/o200k_base');
  const prelude = resolve(root, 'build/.tokenizer-prelude.js');
  writeFileSync(
    prelude,
    "import { countTokens } from 'gpt-tokenizer/model/o200k_base';\n" +
      'globalThis.GPTTokenizer_o200k_base = { countTokens };\n'
  );
  inject = [prelude];
  tokenizerNote = 'exact o200k (gpt-tokenizer bundled in)';
} catch {
  /* optional — ship heuristic-only */
}

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'inline',
  inject,
  write: false,
});

mkdirSync(dirname(outFile), { recursive: true });
const banner =
  '// GENERATED FILE — do not edit. Source: adapters/userscript/main.js + src/core.\n' +
  `// Rebuild with: npm run build:extension. Tokenizer: ${tokenizerNote}.\n` +
  '// Runs as an MV3 MAIN-world content script.\n\n';
writeFileSync(outFile, banner + result.outputFiles[0].text);
console.log(`Wrote ${outFile} — tokenizer: ${tokenizerNote}`);
