// One DuckDB-WASM instance per page, created on first use. Engine and data are self-hosted
// under baseUrl (PLAN.md §7), so this works on GitHub Pages with no CDN.
import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-browser';
import manifest from '@site/static/datasets/manifest.json';
import type {Cell} from './compare';

export type Manifest = Record<
  string,
  Record<string, {rows: number; columns: {name: string; type: string}[]}>
>;
export const datasets = manifest as Manifest;

export type QueryResult = {columns: string[]; rows: Cell[][]; ms: number};

type Engine = {db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection};
let dbPromise: Promise<Engine> | null = null;
const loaded = new Map<string, Promise<void>>();

function connect(baseUrl: string): Promise<Engine> {
  dbPromise ??= (async () => {
    const abs = (p: string) => new URL(`${baseUrl}${p}`, window.location.href).href;
    const worker = new Worker(abs('duckdb/duckdb-browser-eh.worker.js'));
    const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(abs('duckdb/duckdb-eh.wasm'));
    await db.open({
      query: {castBigIntToDouble: true, castDecimalToDouble: true, castTimestampToDate: true},
    });
    const conn = await db.connect();
    // Load extensions from our own static/duckdb/extensions, never extensions.duckdb.org.
    const repo = abs('duckdb/extensions');
    await conn.query(`SET custom_extension_repository = '${repo}'`);
    await conn.query(`SET autoinstall_extension_repository = '${repo}'`);
    await conn.query('LOAD parquet');
    return {db, conn};
  })();
  dbPromise.catch(() => (dbPromise = null)); // allow a retry after a failed load
  return dbPromise;
}

export async function loadDataset(baseUrl: string, name: string): Promise<void> {
  if (!loaded.has(name)) {
    const p = (async () => {
      const {db, conn} = await connect(baseUrl);
      for (const table of Object.keys(datasets[name])) {
        const file = `${name}_${table}.parquet`;
        const res = await fetch(`${baseUrl}datasets/${name}/${table}.parquet`);
        if (!res.ok) throw new Error(`Could not load ${table} (${res.status})`);
        await db.registerFileBuffer(file, new Uint8Array(await res.arrayBuffer()));
        await conn.query(
          `CREATE OR REPLACE VIEW ${table} AS SELECT * FROM read_parquet('${file}')`,
        );
      }
    })();
    loaded.set(name, p);
    p.catch(() => loaded.delete(name));
  }
  return loaded.get(name);
}

function toCell(value: unknown, type: string): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (/^Date/.test(type) || /^Timestamp/.test(type)) {
    const ms = value instanceof Date ? value.getTime() : Number(value);
    const iso = new Date(ms).toISOString();
    return /^Date32/.test(type) ? iso.slice(0, 10) : iso.slice(0, 19).replace('T', ' ');
  }
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

export async function runQuery(baseUrl: string, sql: string): Promise<QueryResult> {
  const {conn} = await connect(baseUrl);
  const start = performance.now();
  const table = await conn.query(sql);
  const fields = table.schema.fields;
  const vectors = fields.map((_, i) => table.getChildAt(i));
  const rows: Cell[][] = [];
  for (let r = 0; r < table.numRows; r++) {
    rows.push(fields.map((f, i) => toCell(vectors[i]?.get(r), String(f.type))));
  }
  return {columns: fields.map((f) => f.name), rows, ms: performance.now() - start};
}
