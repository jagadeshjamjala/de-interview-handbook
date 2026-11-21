// Content guardrails (PLAN.md §6): every docs/blog page has valid `levels` + `topic` frontmatter,
// and every question id referenced from MDX exists in the bank.
// Usage: node scripts/check-content.ts   (run after build-questions.ts)
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const LEVELS = new Set(['junior', 'mid', 'senior', 'lead']);
const ROUNDS = new Set(['sql', 'python', 'modeling', 'system-design', 'tools', 'behavioral']);

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.mdx?$/.test(name) ? [p] : [];
  });
}

export function checkContent(dirs: string[], questionIds: Set<string>): string[] {
  const errors: string[] = [];
  for (const file of dirs.flatMap(files).sort()) {
    const rel = relative(process.cwd(), file);
    const text = readFileSync(file, 'utf8');
    const fm = /^---\n([\s\S]*?)\n---/.exec(text);
    const meta = (fm ? parse(fm[1]) : null) ?? {};
    const levels = meta.levels;
    if (!Array.isArray(levels) || levels.length === 0 || !levels.every((l) => LEVELS.has(l))) {
      errors.push(
        `${rel}: frontmatter "levels" must be a non-empty list of junior|mid|senior|lead`,
      );
    }
    if (!Array.isArray(meta.topic) || meta.topic.length === 0) {
      errors.push(`${rel}: frontmatter "topic" must be a non-empty list`);
    }
    const ids = [
      ...[...text.matchAll(/<QuestionEmbed\s+id="([^"]+)"/g)].map((m) => m[1]),
      ...[...text.matchAll(/ids=\{\[([^\]]*)\]\}/g)].flatMap((m) =>
        [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]),
      ),
    ];
    for (const id of ids) {
      if (!questionIds.has(id)) errors.push(`${rel}: unknown question id "${id}"`);
    }
    for (const m of text.matchAll(/<RelatedQuestions[^>]*\bround="([^"]+)"/g)) {
      if (!ROUNDS.has(m[1])) errors.push(`${rel}: unknown round "${m[1]}"`);
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const site = join(root, 'apps/website');
  const bank = JSON.parse(readFileSync(join(site, 'src/data/questions.json'), 'utf8')) as {
    id: string;
  }[];
  const errors = checkContent(
    [join(site, 'docs'), join(site, 'blog')],
    new Set(bank.map((q) => q.id)),
  );
  if (errors.length) {
    console.error(`✗ ${errors.length} content error(s):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  console.log('✓ content: frontmatter and question references OK');
}
