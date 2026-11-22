import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKILLS, radarPoint, weakTopics} from './radar.ts';

test('only skills rated 1–2 become weak topics; unrated skills never do', () => {
  assert.deepEqual(weakTopics({}), []);
  assert.deepEqual(weakTopics({streaming: 3, python: 5}), []);
  const w = weakTopics({streaming: 2, behavioral: 1});
  assert.ok(w.includes('kafka') && w.includes('stakeholders') && !w.includes('aggregation'));
  assert.deepEqual(w, [...w].sort());
});

test('every skill topic is tagged on at least one question, so the planner can use it', () => {
  const index = JSON.parse(
    readFileSync(new URL('../data/questions-index.json', import.meta.url), 'utf8'),
  ) as {topic: string[]}[];
  const tagged = new Set(index.flatMap((q) => q.topic));
  for (const s of SKILLS) for (const t of s.topics) assert.ok(tagged.has(t), `${s.id}: ${t}`);
  assert.equal(new Set(SKILLS.map((s) => s.id)).size, SKILLS.length);
});

test('radarPoint: axis 0 points up, full value reaches the radius', () => {
  const p = radarPoint(0, 8, 5, 5, 100, 120);
  assert.ok(Math.abs(p.x - 120) < 1e-9 && Math.abs(p.y - 20) < 1e-9);
  assert.deepEqual(radarPoint(3, 8, 0, 5, 100, 120), {x: 120, y: 120});
});
