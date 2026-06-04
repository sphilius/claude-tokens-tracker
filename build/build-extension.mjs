/**
 * Bundles the SAME userscript adapter + core into the MV3 extension's
 * MAIN-world content script. The adapter runs identically in a userscript and
 * in a `world: "MAIN"` content script (both are page context), so there is one
 * source of truth (adapters/userscript/main.js) and two build targets.
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

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'inline',
  write: false,
});

mkdirSync(dirname(outFile), { recursive: true });
const banner =
  '// GENERATED FILE — do not edit. Source: adapters/userscript/main.js + src/core.\n' +
  '// Rebuild with: npm run build:extension. Runs as an MV3 MAIN-world content script.\n\n';
writeFileSync(outFile, banner + result.outputFiles[0].text);
console.log(`Wrote ${outFile}`);
