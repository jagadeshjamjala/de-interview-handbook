import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  BOX_H,
  CANVAS_H,
  PROVIDER_PRESETS,
  STAGES,
  addBox,
  clampBox,
  connect,
  empty,
  findings,
  outline,
  removeBox,
} from './canvas.ts';

test('addBox stacks boxes per stage column with unique ids', () => {
  let d = addBox(addBox(empty(), 'source', 'Postgres'), 'source', 'API');
  d = addBox(d, 'serve', 'BI');
  assert.deepEqual(
    d.boxes.map((b) => b.id),
    ['b1', 'b2', 'b3'],
  );
  assert.equal(d.boxes[1].y - d.boxes[0].y, BOX_H + 24);
  assert.ok(d.boxes[2].x > d.boxes[0].x);
  assert.equal(addBox(removeBox(d, 'b1'), 'store', 'S3').boxes.at(-1)!.id, 'b4');
});

test('connect ignores self-loops and duplicates; removeBox drops its edges', () => {
  let d = addBox(addBox(empty(), 'source', 'A'), 'ingest', 'B');
  d = connect(connect(connect(d, 'b1', 'b2'), 'b1', 'b2'), 'b1', 'b1');
  assert.equal(d.edges.length, 1);
  assert.equal(removeBox(d, 'b2').edges.length, 0);
});

test('clampBox keeps boxes inside the canvas', () => {
  assert.deepEqual(clampBox(-50, 99_999), {x: 0, y: CANVAS_H - BOX_H});
});

test('findings: missing stages, loose boxes, no source→serve path; none for a full pipeline', () => {
  assert.deepEqual(findings(empty()), []);
  let d = empty();
  for (const [s, l] of [
    ['source', 'PG'],
    ['ingest', 'CDC'],
    ['store', 'Lake'],
    ['transform', 'dbt'],
    ['serve', 'BI'],
  ] as const)
    d = addBox(d, s, l);
  assert.ok(findings(d).some((f) => f.includes('No path')));
  assert.ok(findings(d).some((f) => f.includes('“PG”')));
  for (let i = 1; i < 5; i++) d = connect(d, `b${i}`, `b${i + 1}`);
  assert.deepEqual(findings(d), []);
  assert.ok(findings(removeBox(d, 'b3')).some((f) => f.startsWith('No store')));
  assert.equal(outline(d).split('\n')[0], 'PG (Source) → CDC (Ingest)');
});

test('every provider palette covers every stage with unique names', () => {
  for (const [provider, palette] of Object.entries(PROVIDER_PRESETS)) {
    assert.deepEqual(Object.keys(palette).sort(), [...STAGES].sort(), provider);
    for (const s of STAGES) {
      assert.ok(palette[s].length >= 2, `${provider}.${s}`);
      assert.equal(new Set(palette[s]).size, palette[s].length, `${provider}.${s} duplicates`);
      assert.ok(
        palette[s].every((l) => l.length <= 40),
        `${provider}.${s} label too long`,
      );
    }
  }
});
