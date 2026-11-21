import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMockPrompt,
  pickQuestions,
  questionScore,
  roundScores,
  weakTopics,
  type MockQuestion,
} from './mock.ts';

const sqlQ: MockQuestion = {
  id: 'sql-x',
  title: 'SQL x',
  round: 'sql',
  levels: ['mid'],
  topic: ['window-functions', 'gaps-and-islands'],
  time_minutes: 20,
  prompt: 'Write it.',
  rubric: [{point: 'Dedups first', weight: 2, topic: 'gaps-and-islands'}],
  solution: {sql: 'SELECT 1;'},
};
const sqlNoRubric: MockQuestion = {...sqlQ, id: 'sql-y', rubric: undefined};
const modQ: MockQuestion = {
  id: 'modeling-x',
  title: 'Model x',
  round: 'modeling',
  levels: ['mid', 'senior'],
  topic: ['grain', 'scd-type-2'],
  time_minutes: 30,
  prompt: 'Model it.',
  rubric: [
    {point: 'States grain', weight: 3, topic: 'grain'},
    {point: 'SCD2', weight: 1, topic: 'scd-type-2'},
    {point: 'Talks about cost', weight: 1},
  ],
  solution: {},
};

test('SQL: 60% auto-check + 40% rubric; auto-check alone without rubric', () => {
  assert.equal(questionScore(sqlQ, {marks: ['strong'], autoCorrect: true}), 1);
  assert.equal(questionScore(sqlQ, {marks: ['missed'], autoCorrect: true}), 0.6);
  assert.equal(questionScore(sqlQ, {marks: ['partial'], autoCorrect: false}), 0.2);
  assert.equal(questionScore(sqlNoRubric, {marks: [], autoCorrect: true}), 1);
  assert.equal(questionScore(sqlNoRubric, {marks: []}), 0);
});

test('rubric: weighted strong/partial/missed, unmarked counts as missed', () => {
  assert.equal(questionScore(modQ, {marks: ['strong', 'strong', 'strong']}), 1);
  assert.equal(questionScore(modQ, {marks: ['strong', 'partial', 'missed']}), 3.5 / 5);
  assert.equal(questionScore(modQ, {marks: ['strong']}), 3 / 5);
});

test('weak topics: missed point topics, plus all topics under 60%', () => {
  // 0.7: above threshold, only the missed point's topic
  assert.deepEqual(weakTopics([modQ], [{marks: ['strong', 'missed', 'partial']}]), ['scd-type-2']);
  // 0.6 exactly: not below, so no fallback; the untagged missed point adds nothing
  assert.deepEqual(weakTopics([modQ], [{marks: ['strong', 'strong', 'missed']}]).length, 0);
  // 0.4: below 60% -> every topic of the question
  assert.deepEqual(weakTopics([modQ], [{marks: ['missed', 'strong', 'strong']}]), [
    'grain',
    'scd-type-2',
  ]);
  // SQL wrong but rubric strong: 0.4 -> all topics
  assert.deepEqual(weakTopics([sqlQ], [{marks: ['strong'], autoCorrect: false}]), [
    'gaps-and-islands',
    'window-functions',
  ]);
});

test('round scores average per round', () => {
  const r = roundScores(
    [sqlQ, sqlNoRubric, modQ],
    [{marks: ['strong'], autoCorrect: true}, {marks: []}, {marks: ['strong', 'strong', 'strong']}],
  );
  assert.deepEqual(r, [
    {round: 'sql', pct: 50},
    {round: 'modeling', pct: 100},
  ]);
});

test('pickQuestions fits the time budget, filters by level, mixes rounds', () => {
  const pool = [sqlQ, sqlNoRubric, modQ, {...modQ, id: 'modeling-y', levels: ['senior' as const]}];
  let seed = 1;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const picked = pickQuestions(pool, {round: 'mixed', level: 'mid', minutes: 50}, rng);
  assert.ok(picked.reduce((s, q) => s + q.time_minutes, 0) <= 50);
  assert.ok(picked.every((q) => q.levels.includes('mid')));
  assert.deepEqual(new Set(picked.map((q) => q.round)), new Set(['sql', 'modeling']));
  // nothing fits -> the shortest question, so a session never starts empty
  assert.deepEqual(
    pickQuestions([modQ], {round: 'modeling', level: 'mid', minutes: 10}, rng).map((q) => q.id),
    ['modeling-x'],
  );
});

test('AI prompt: questions in order, rubric marked interviewer-only, SQL reference included', () => {
  const p = buildMockPrompt([sqlQ, modQ], 'mid');
  assert.match(p, /50-minute mock interview for a mid-level candidate/);
  assert.ok(p.indexOf('Question 1 of 2: SQL x') < p.indexOf('Question 2 of 2: Model x'));
  assert.match(p, /do not show to the candidate/);
  assert.match(p, /\[weight 3\] States grain \(topic: grain\)/);
  assert.match(p, /SELECT 1;/);
});
