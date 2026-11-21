// The package's "exports" map has no types for the explicit browser entry; reuse the root types.
// (Importing the browser entry keeps the Node build out of Docusaurus' server bundle.)
declare module '@duckdb/duckdb-wasm/dist/duckdb-browser' {
  export * from '@duckdb/duckdb-wasm';
}
