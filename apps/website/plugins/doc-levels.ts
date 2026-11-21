// Exposes each doc's `levels` frontmatter as global data { docId: levels } so the sidebar can dim
// pages that aren't tagged for the reader's level (PLAN.md §4.4).
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {parse} from 'yaml';
import type {LoadContext, Plugin} from '@docusaurus/types';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.mdx?$/.test(name) ? [p] : [];
  });
}

export default function docLevels(context: LoadContext): Plugin {
  const docs = join(context.siteDir, 'docs');
  return {
    name: 'doc-levels',
    getPathsToWatch: () => [join(docs, '**/*.{md,mdx}')],
    async loadContent() {
      const out: Record<string, string[]> = {};
      for (const file of files(docs)) {
        const fm = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'));
        const meta = fm ? parse(fm[1]) : null;
        const id = relative(docs, file)
          .replace(/\\/g, '/')
          .replace(/\.mdx?$/, '');
        if (Array.isArray(meta?.levels)) out[meta.id ?? id] = meta.levels;
      }
      return out;
    },
    async contentLoaded({content, actions}) {
      actions.setGlobalData(content);
    },
  };
}
