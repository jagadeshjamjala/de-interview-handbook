import {test} from 'node:test';
import assert from 'node:assert/strict';
import {starterCode} from './pyStarter.ts';

const solution = `import csv
from itertools import islice

class TransientError(Exception):
    pass

def batches(f, size):
    if size < 1:
        raise ValueError("size")
    return _batches(csv.DictReader(f), size)

def _batches(reader, size):
    while batch := list(islice(reader, size)):
        yield batch

def fetch_all(get_page,
              max_retries=3):
    return []
`;

test('includes only what the prompt names, with empty bodies', () => {
  const s = starterCode('Write a generator `batches(f, size)`.', solution);
  assert.doesNotMatch(s, /import/); // imports not needed by the signature would hint at the approach
  assert.match(s, /def batches\(f, size\):\n {4}# your code here\n {4}raise NotImplementedError/);
  assert.doesNotMatch(s, /_batches/); // helper not mentioned in the prompt stays hidden
  assert.doesNotMatch(s, /DictReader/); // no solution body
});

test('classes named in the prompt are given in full; multi-line signatures kept', () => {
  const s = starterCode('Write fetch_all(...). TransientError is defined for you.', solution);
  assert.match(s, /class TransientError\(Exception\):\n {4}pass/);
  const withTime = starterCode(
    'fetch_all',
    'import time\nimport heapq\n\ndef fetch_all(sleep=time.sleep):\n    pass\n',
  );
  assert.match(withTime, /^import time\n/);
  assert.doesNotMatch(withTime, /heapq/);
  assert.match(s, /def fetch_all\(get_page,\n {14}max_retries=3\):\n {4}# your code here/);
  assert.doesNotMatch(s, /def batches/);
});

test('works on every real Python question', async () => {
  const {readFileSync, readdirSync} = await import('node:fs');
  const {parse} = await import('yaml');
  const dir = new URL('../../../../questions/python/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const q = parse(readFileSync(new URL(f, dir), 'utf8'));
    const s = starterCode(q.prompt, q.solution.python);
    assert.match(s, /\bdef \w+\(/, `${q.id}: no function in starter`);
    assert.match(s, /raise NotImplementedError/, `${q.id}: body not hidden`);
  }
});
