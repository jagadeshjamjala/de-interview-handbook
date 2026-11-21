import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadQuestions} from './build-questions.ts';

const sql = `id: sql-ok
title: A valid question
round: sql
topic: [window-functions]
levels: [junior]
difficulty: easy
companies: []
dataset: events
time_minutes: 10
prompt: Count users.
solution:
  sql: SELECT COUNT(*) FROM users;
check:
  order_matters: false
`;

const modeling = `id: modeling-ok
title: A valid modeling question
round: modeling
topic: [grain]
levels: [mid]
difficulty: medium
companies: []
time_minutes: 20
prompt: Model it.
solution:
  answer: Like this.
rubric:
  - point: States the grain
    weight: 2
`;

function run(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'deih-q-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), {recursive: true});
    writeFileSync(join(dir, path), body);
  }
  return loadQuestions(dir);
}

test('valid questions pass and get rendered html', () => {
  const r = run({'sql/sql-ok.yaml': sql, 'modeling/modeling-ok.yaml': modeling});
  assert.deepEqual(r.errors, []);
  assert.equal(r.questions.length, 2);
  assert.match((r.questions[0] as {html: {prompt: string}}).html.prompt, /<p>/);
});

const broken: [string, Record<string, string>, RegExp][] = [
  ['malformed YAML', {'sql/sql-ok.yaml': 'id: [unclosed'}, /invalid YAML/],
  ['missing levels', {'sql/sql-ok.yaml': sql.replace('levels: [junior]\n', '')}, /levels/],
  ['unknown level', {'sql/sql-ok.yaml': sql.replace('[junior]', '[intern]')}, /allowed values/],
  ['typo field', {'sql/sql-ok.yaml': sql + 'hintz: []\n'}, /additional properties/],
  ['sql without check', {'sql/sql-ok.yaml': sql.replace(/check:[\s\S]*/, '')}, /check/],
  [
    'modeling without rubric',
    {'modeling/modeling-ok.yaml': modeling.replace(/rubric:[\s\S]*/, '')},
    /rubric/,
  ],
  [
    'company without source',
    {'sql/sql-ok.yaml': sql.replace('companies: []', 'companies: [{name: Acme}]')},
    /source/,
  ],
  ['id != file name', {'sql/sql-other.yaml': sql}, /must match file name/],
  ['round != folder', {'modeling/sql-ok.yaml': sql}, /must match folder/],
  [
    'dialect note without source',
    {'sql/sql-ok.yaml': sql + 'dialect_notes:\n  snowflake:\n    note: hi\n'},
    /source/,
  ],
];

for (const [name, files, expected] of broken) {
  test(`fails: ${name}`, () => {
    const {errors} = run(files);
    assert.ok(errors.length > 0, 'expected an error');
    assert.match(errors.join('\n'), expected);
  });
}

test('raw HTML in markdown is escaped', () => {
  const r = run({
    'sql/sql-ok.yaml': sql.replace('prompt: Count users.', 'prompt: "<script>x</script>"'),
  });
  assert.deepEqual(r.errors, []);
  const html = (r.questions[0] as {html: {prompt: string}}).html.prompt;
  assert.doesNotMatch(html, /<script>/);
});

test('duplicate ids fail', () => {
  const {errors} = run({'sql/sql-ok.yaml': sql, 'sql/nested/sql-ok.yaml': sql});
  assert.match(errors.join('\n'), /duplicate id/);
});
