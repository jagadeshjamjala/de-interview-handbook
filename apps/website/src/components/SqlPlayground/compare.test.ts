import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareResults} from './compare.ts';

const ordered = {order_matters: true};
const unordered = {order_matters: false};

test('identical results pass', () => {
  assert.deepEqual(compareResults(2, [[1, 'a']], 2, [[1, 'a']], ordered), {ok: true});
});

test('column count mismatch', () => {
  const v = compareResults(1, [[1]], 2, [[1, 'a']], ordered);
  assert.deepEqual(v, {ok: false, message: 'Wrong column count (got 1, expected 2)'});
});

test('row count mismatch uses got/expected wording', () => {
  const v = compareResults(1, [[1], [2]], 1, [[1]], ordered);
  assert.deepEqual(v, {ok: false, message: 'Wrong row count (got 2, expected 1)'});
});

test('order matters only when asked', () => {
  const got = [[2], [1]];
  const want = [[1], [2]];
  assert.equal(compareResults(1, got, 1, want, ordered).ok, false);
  assert.equal(compareResults(1, got, 1, want, unordered).ok, true);
});

test('reports the first differing row', () => {
  const v = compareResults(1, [[1], [2], [9]], 1, [[1], [2], [3]], ordered);
  assert.deepEqual(v, {ok: false, message: 'Values differ in row 3'});
});

test('float tolerance', () => {
  const check = {order_matters: true, float_tolerance: 0.01};
  assert.equal(compareResults(1, [[0.333]], 1, [[0.33]], check).ok, true);
  assert.equal(compareResults(1, [[0.35]], 1, [[0.33]], check).ok, false);
  assert.equal(compareResults(1, [[0.1 + 0.2]], 1, [[0.3]], ordered).ok, true); // double noise, no tolerance set
});

test('NULL is not equal to 0 or empty string', () => {
  assert.equal(compareResults(1, [[null]], 1, [[0]], ordered).ok, false);
  assert.equal(compareResults(1, [[null]], 1, [['']], ordered).ok, false);
});

test('unordered compare tolerates float noise in the sort key', () => {
  const check = {order_matters: false, float_tolerance: 0.01};
  assert.equal(
    compareResults(
      2,
      [
        ['b', 0.5000001],
        ['a', 1],
      ],
      2,
      [
        ['a', 1],
        ['b', 0.5],
      ],
      check,
    ).ok,
    true,
  );
});
