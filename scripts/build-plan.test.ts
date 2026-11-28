import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadPlan, TARGETS} from './build-plan.ts';

// A full, valid 75-item plan built from targets: 1 live SQL item, everything else planned.
function plan(): {items: Record<string, unknown>[]} {
  const items: Record<string, unknown>[] = [{id: 'sql-live'}];
  for (const [round, n] of Object.entries(TARGETS)) {
    for (let i = round === 'sql' ? 1 : 0; i < n; i++) {
      items.push({id: `${round}-p${i}`, round, title: `t${i}`, planned: true});
    }
  }
  return {items};
}
const bank = new Map([['sql-live', {round: 'sql'}]]);

test('valid plan passes', () => {
  const r = loadPlan(plan(), bank);
  assert.deepEqual(r.errors, []);
  assert.equal(r.items.length, 75);
  assert.equal(r.items.filter((i) => !i.planned).length, 1);
});

test('unknown live id fails', () => {
  const p = plan();
  p.items[0] = {id: 'sql-missing'};
  assert.match(loadPlan(p, bank).errors.join('\n'), /no question with this id/);
});

test('planned ids are skipped, but must not shadow a real question', () => {
  const p = plan();
  p.items[0] = {id: 'sql-live', round: 'sql', title: 'x', planned: true};
  assert.match(loadPlan(p, bank).errors.join('\n'), /question now exists/);
});

test('duplicates, wrong counts, bad roles fail', () => {
  const dup = plan();
  dup.items.push({id: 'sql-live'});
  const errs = loadPlan(dup, bank).errors.join('\n');
  assert.match(errs, /duplicate id/);
  assert.match(errs, /round sql: 31 items, expected 30/);
  const roles = plan();
  roles.items[0] = {id: 'sql-live', roles: ['chef']};
  assert.match(loadPlan(roles, bank).errors.join('\n'), /roles must be/);
});

test('role packs: known roles, existing ids, not in DE 75, no duplicates', async () => {
  const {loadPacks} = await import('./build-plan.ts');
  const qs = new Map([
    ['x', {}],
    ['y', {}],
    ['in75', {}],
  ]);
  const ok = loadPacks({packs: {etl: ['x', 'y'], cloud: []}}, qs, new Set(['in75']));
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.packs, {etl: ['x', 'y'], cloud: []});
  const bad = loadPacks(
    {packs: {nope: ['x'], etl: ['missing', 'in75', 'x', 'x'], cloud: 'x' as unknown as string[]}},
    qs,
    new Set(['in75']),
  ).errors.join('\n');
  assert.match(bad, /unknown role/);
  assert.match(bad, /no question with id "missing"/);
  assert.match(bad, /already in DE 75/);
  assert.match(bad, /duplicate x/);
  assert.match(bad, /must be a list/);
  assert.deepEqual(loadPacks(null, qs, new Set()).packs, {});
});
