import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DRILLS} from './drills.ts';

const ids = new Set(
  (
    JSON.parse(readFileSync(new URL('../data/questions-index.json', import.meta.url), 'utf8')) as {
      id: string;
    }[]
  ).map((q) => q.id),
);

test('drill ids are unique and related questions exist', () => {
  assert.equal(new Set(DRILLS.map((d) => d.id)).size, DRILLS.length);
  for (const d of DRILLS) for (const q of d.related) assert.ok(ids.has(q), `${d.id}: ${q}`);
});

for (const d of DRILLS) {
  test(`${d.id}: every step is reachable, every move leads somewhere, and the drill can end`, () => {
    const steps = d.steps;
    assert.ok(steps[d.start], 'start step exists');
    const seen = new Set<string>();
    const queue = [d.start];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const choices = steps[id].choices ?? [];
      if (choices.length) {
        assert.ok(
          choices.some((c) => c.verdict === 'best'),
          `${id} has a best move`,
        );
        assert.ok(
          choices.some((c) => c.next !== id),
          `${id} can be left`,
        );
      }
      for (const c of choices) {
        assert.ok(steps[c.next], `${id} → ${c.next} exists`);
        // A weak move loops back so the reader tries again; others must move forward.
        assert.equal(
          c.verdict === 'weak',
          c.next === id,
          `${id}: "${c.label}" verdict matches its target`,
        );
        queue.push(c.next);
      }
    }
    assert.deepEqual([...seen].sort(), Object.keys(steps).sort(), 'no unreachable steps');
    assert.ok(
      Object.values(steps).some((s) => !s.choices),
      'has an ending',
    );
  });
}
