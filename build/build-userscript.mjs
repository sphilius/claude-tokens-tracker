/**
 * Bundles the userscript adapter + core into a single installable .user.js,
 * preserving the ==UserScript== metadata header.
 *
 * Usage: node build/build-userscript.mjs   (or: npm run build:userscript)
 * Requires: esbuild (devDependency).
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'adapters/userscript/main.js');
const header = readFileSync(resolve(root, 'adapters/userscript/header.txt'), 'utf8').trimEnd();
const outFile = resolve(root, 'dist/claude-tokens-tracker.user.js');

const result = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  legalComments: 'inline',
  write: false,
});

mkdirSync(dirname(outFile), { recursive: true });
const banner = `${header}\n\n// GENERATED FILE — do not edit. Source: adapters/userscript + src/core.\n// Rebuild with: npm run build:userscript\n\n`;
writeFileSync(outFile, banner + result.outputFiles[0].text);
console.log(`Wrote ${outFile}`);
