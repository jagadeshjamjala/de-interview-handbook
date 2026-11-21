Official DuckDB extension binaries, vendored so the playground never fetches from a CDN
(PLAN.md §7). Source: `https://extensions.duckdb.org/<version>/wasm_eh/<name>.duckdb_extension.wasm`.
DuckDB verifies their signatures on load. `scripts/copy-duckdb.ts` checks the SHA-256 and copies
them to `static/duckdb/extensions/`. When bumping `@duckdb/duckdb-wasm`, download the matching
engine version and update the hash there.
