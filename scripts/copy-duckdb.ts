// Self-host DuckDB-WASM (PLAN.md §7): copy the engine + worker into static/duckdb/ before
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
