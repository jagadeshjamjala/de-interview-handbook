// Self-host the browser runtimes (PLAN.md §7): DuckDB-WASM and Pyodide are copied into static/ before
// start/build. Not committed (33 MB); regenerated from the pinned npm package.
// shortcut: only the "eh" bundle (Chrome 95+, Firefox 100+, Safari 15.2+); add mvp if older browsers matter.
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const website = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/website');
const dist = dirname(createRequire(join(website, 'package.json')).resolve('@duckdb/duckdb-wasm'));
const out = join(website, 'static/duckdb');
mkdirSync(out, {recursive: true});
for (const file of ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js']) {
  copyFileSync(join(dist, file), join(out, file));
}

// Parquet support is a DuckDB extension; serve the vendored, hash-pinned binary ourselves.
const ext = 'v1.4.3/wasm_eh/parquet.duckdb_extension.wasm';
const sha256 = '22765c8f7dc741cda2b571a66ac7bb355295d7d69a6c37e5315b265672984f55';
const src = resolve(website, '../../vendor/duckdb-extensions', ext);
const actual = createHash('sha256').update(readFileSync(src)).digest('hex');
if (actual !== sha256) throw new Error(`${ext}: sha256 ${actual} does not match pinned ${sha256}`);
mkdirSync(join(out, 'extensions', dirname(ext)), {recursive: true});
copyFileSync(src, join(out, 'extensions', ext));
console.log(`✓ DuckDB-WASM copied → apps/website/static/duckdb`);

// Pyodide (Python in WebAssembly) for the Python playground, from the pinned npm package.
const pyDist = dirname(
  createRequire(join(website, 'package.json')).resolve('pyodide/package.json'),
);
const pyOut = join(website, 'static/pyodide');
mkdirSync(pyOut, {recursive: true});
for (const file of [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]) {
  copyFileSync(join(pyDist, file), join(pyOut, file));
}
console.log(`✓ Pyodide copied → apps/website/static/pyodide`);

// Fonts with stable names so docusaurus.config.ts can preload them (see static/fonts/fonts.css).
const fontOut = join(website, 'static/fonts');
for (const [pkg, file] of [
  ['ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2'],
  ['ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2'],
  ['ibm-plex-sans', 'ibm-plex-sans-latin-700-normal.woff2'],
  ['jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2'],
]) {
  copyFileSync(join(website, 'node_modules/@fontsource', pkg, 'files', file), join(fontOut, file));
}
console.log(`✓ Fonts copied → apps/website/static/fonts`);
