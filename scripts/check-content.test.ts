import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkContent} from './check-content.ts';

const ids = new Set(['sql-a', 'sql-b']);
const good = '---\nlevels: [junior, mid]\ntopic: [sql]\n---\n\n# Page\n';

function run(body: string) {
  const dir = mkdtempSync(join(tmpdir(), 'deih-c-'));
  writeFileSync(join(dir, 'page.mdx'), body);
  return checkContent([dir], ids);
}

test('valid page passes', () => {
  assert.deepEqual(run(good + '<RelatedQuestions ids={["sql-a", \'sql-b\']} />\n'), []);
});

test('missing or invalid frontmatter fails', () => {
  assert.match(run('# no frontmatter\n').join('\n'), /levels/);
  assert.match(run('---\nlevels: [intern]\ntopic: [x]\n---\n').join('\n'), /levels/);
  assert.match(run('---\nlevels: [mid]\n---\n').join('\n'), /topic/);
});

test('unknown question ids and rounds fail', () => {
  assert.match(run(good + '<QuestionEmbed id="sql-zzz" />').join('\n'), /sql-zzz/);
  assert.match(run(good + '<RelatedQuestions ids={["sql-a", "nope"]} />').join('\n'), /nope/);
  assert.match(run(good + '<RelatedQuestions round="cooking" />').join('\n'), /cooking/);
});
