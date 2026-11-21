// Result-set comparison for "Check my answer". Mirrors scripts/verify_sql.py:
// column count, row count, values; order-aware only if order_matters; float tolerance.
// Plain TS (no imports) so `node --test` can run compare.test.ts directly.

export type Cell = string | number | boolean | null;
export type Check = {order_matters: boolean; float_tolerance?: number};
export type Verdict = {ok: true} | {ok: false; message: string};

function sameCell(a: Cell, b: Cell, tol: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tol + 1e-9;
  return a === b;
}

function sortKey(row: Cell[], decimals: number): string {
  return JSON.stringify(row.map((v) => (typeof v === 'number' ? v.toFixed(decimals) : v)));
}

function sorted(rows: Cell[][], decimals: number): Cell[][] {
  return rows
    .map((r) => [sortKey(r, decimals), r] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, r]) => r);
}

export function compareResults(
  gotCols: number,
  got: Cell[][],
  wantCols: number,
  want: Cell[][],
  check: Check,
): Verdict {
  if (gotCols !== wantCols) {
    return {ok: false, message: `Wrong column count (got ${gotCols}, expected ${wantCols})`};
  }
  if (got.length !== want.length) {
    return {ok: false, message: `Wrong row count (got ${got.length}, expected ${want.length})`};
  }
  const tol = check.float_tolerance ?? 0;
  const decimals = tol > 0 ? Math.max(0, Math.round(-Math.log10(tol))) : 6;
  const [g, w] = check.order_matters
    ? [got, want]
    : [sorted(got, decimals), sorted(want, decimals)];
  for (let i = 0; i < g.length; i++) {
    if (!g[i].every((v, j) => sameCell(v, w[i][j], tol))) {
      const where = check.order_matters ? `row ${i + 1}` : `row ${i + 1} (after sorting)`;
      return {ok: false, message: `Values differ in ${where}`};
    }
  }
  return {ok: true};
}
