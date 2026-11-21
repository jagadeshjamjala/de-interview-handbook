// Validates every questions/<round>/*.yaml against schemas/question.schema.json and
// emits apps/website/src/data/questions.json (markdown pre-rendered to HTML).
// Usage: node scripts/build-questions.ts [questionsDir] [outFile]
import {readFileSync, readdirSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {basename, dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Ajv} from 'ajv';
import {parse} from 'yaml';
import MarkdownIt from 'markdown-it';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(join(root, 'schemas/question.schema.json'), 'utf8'));
const validate = new Ajv({allErrors: true}).compile(schema);
// html: false (default) escapes raw HTML in YAML, so contributed text can't inject markup.
const md = new MarkdownIt();

type Raw = {
  id: string;
  round: string;
  prompt: string;
  hints?: string[];
  solution: {answer?: string; explanation?: string};
};

function yamlFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return yamlFiles(p);
      return /\.ya?ml$/.test(name) ? [p] : [];
    })
    .sort();
}

export function loadQuestions(dir: string): {
  questions: Record<string, unknown>[];
  errors: string[];
} {
  const errors: string[] = [];
  const questions: Record<string, unknown>[] = [];
  const seen = new Map<string, string>();

  for (const file of yamlFiles(dir)) {
    const rel = relative(dir, file);
    let data: unknown;
    try {
      data = parse(readFileSync(file, 'utf8'));
    } catch (e) {
      errors.push(`${rel}: invalid YAML: ${(e as Error).message.split('\n')[0]}`);
      continue;
    }
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        errors.push(`${rel}: ${err.instancePath || '(root)'} ${err.message}`);
      }
      continue;
    }
    const q = data as Raw;
    const stem = basename(file).replace(/\.ya?ml$/, '');
    if (q.id !== stem) errors.push(`${rel}: id "${q.id}" must match file name "${stem}"`);
    const folder = relative(dir, dirname(file)).split(/[\\/]/)[0];
    if (q.round !== folder) errors.push(`${rel}: round "${q.round}" must match folder "${folder}"`);
    if (seen.has(q.id)) errors.push(`${rel}: duplicate id "${q.id}" (also in ${seen.get(q.id)})`);
    seen.set(q.id, rel);

    questions.push({
      ...q,
      html: {
        prompt: md.render(q.prompt),
        hints: (q.hints ?? []).map((h) => md.render(h)),
        answer: q.solution.answer ? md.render(q.solution.answer) : undefined,
        explanation: q.solution.explanation ? md.render(q.solution.explanation) : undefined,
      },
    });
  }
  return {questions, errors};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = resolve(process.argv[2] ?? join(root, 'questions'));
  const out = resolve(process.argv[3] ?? join(root, 'apps/website/src/data/questions.json'));
  const {questions, errors} = loadQuestions(dir);
  if (errors.length) {
    console.error(`✗ ${errors.length} question error(s):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify(questions, null, 2) + '\n');
  console.log(`✓ ${questions.length} questions → ${relative(root, out)}`);
}
