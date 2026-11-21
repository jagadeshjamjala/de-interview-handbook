import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addDays, buildQueue, localDay, nextDue, schedule, type Progress} from './srs.ts';

const T = '2024-05-10';

test('addDays crosses months and leap days', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDays('2024-12-31', 1), '2025-01-01');
  assert.equal(localDay(new Date(2024, 0, 5)), '2024-01-05');
});

test('new cards: good = 1 day, easy = 4 days, again = today', () => {
  assert.deepEqual(schedule(undefined, 'good', T), {
    due: '2024-05-11',
    interval: 1,
    ease: 2.5,
    reps: 1,
  });
  assert.deepEqual(schedule(undefined, 'easy', T), {
    due: '2024-05-14',
    interval: 4,
    ease: 2.65,
    reps: 1,
  });
  assert.equal(schedule(undefined, 'again', T).due, T);
});

test('intervals grow with good answers and reset with again', () => {
  let s = schedule(undefined, 'good', T); // 1
  s = schedule(s, 'good', s.due); // 3
  assert.equal(s.interval, 3);
  s = schedule(s, 'good', s.due); // 3 * 2.5 = 8 (rounded)
  assert.equal(s.interval, 8);
  s = schedule(s, 'good', s.due);
  assert.equal(s.interval, 20);
  const lapse = schedule(s, 'again', s.due);
  assert.equal(lapse.interval, 0);
  assert.equal(lapse.reps, 0);
  assert.equal(lapse.ease, 2.3);
});

test('hard grows slowly and lowers ease; ease never drops below 1.3', () => {
  const s = schedule({due: T, interval: 10, ease: 2.5, reps: 4}, 'hard', T);
  assert.equal(s.interval, 12);
  assert.equal(s.ease, 2.35);
  let low = {due: T, interval: 1, ease: 1.35, reps: 3};
  for (let i = 0; i < 5; i++) low = schedule(low, 'again', T);
  assert.equal(low.ease, 1.3);
});

test('queue: due cards first (oldest first), then new cards up to the daily limit', () => {
  const deck = ['a', 'b', 'c', 'd', 'e', 'f'];
  const progress: Progress = {
    b: {due: '2024-05-09', interval: 1, ease: 2.5, reps: 1},
    d: {due: '2024-05-01', interval: 3, ease: 2.5, reps: 2},
    f: {due: '2024-06-01', interval: 20, ease: 2.5, reps: 4}, // not due
  };
  assert.deepEqual(buildQueue(deck, progress, T, 2), ['d', 'b', 'a', 'c']);
  assert.deepEqual(buildQueue(deck, progress, T, 0), ['d', 'b']);
  assert.equal(nextDue(deck, progress, T), '2024-06-01');
  assert.equal(nextDue(deck, {}, T), null);
});
