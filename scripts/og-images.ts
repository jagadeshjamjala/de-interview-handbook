// Social preview images (1200×630 PNG): one per doc page plus a site default.
// Output: apps/website/static/img/og/<docId>.png and default.png (generated, not committed).
// Usage: node scripts/og-images.ts
import {mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import satori from 'satori';
import {Resvg} from '@resvg/resvg-js';
import {parse} from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'apps/website');
const out = join(site, 'static/img/og');
const fontDir = join(site, 'node_modules/@fontsource/ibm-plex-sans/files');
const fonts = [400, 700].map((weight) => ({
  name: 'IBM Plex Sans',
  weight: weight as 400 | 700,
  style: 'normal' as const,
  data: readFileSync(join(fontDir, `ibm-plex-sans-latin-${weight}-normal.woff`)),
}));

const SECTIONS: Record<string, string> = {
  'start-here': 'Start here',
  resume: 'Resume & profile',
  rounds: 'The rounds',
  'rounds/system-design': 'Pipeline system design',
  cheatsheets: 'Cheatsheets',
};

type El = {type: string; props: {style?: Record<string, unknown>; children?: unknown}};
const CONTENT = 1200 - 16 - 72 * 2;
const div = (style: Record<string, unknown>, children?: unknown): El => ({
  type: 'div',
  props: {style, children},
});

function card(title: string, kicker: string, chips: string[]): El {
  return div(
    {
      // Satori sizes boxes as content-box: subtract padding and border from the canvas size.
      width: 1200 - 72 * 2 - 16,
      height: 630 - 64 * 2,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      background: '#0b1416',
      color: '#e6f4f1',
      fontFamily: 'IBM Plex Sans',
      borderLeftWidth: 16,
      borderLeftStyle: 'solid',
      borderLeftColor: '#2dd4bf',
    },
    [
      div(
        {display: 'flex', fontSize: 30, color: '#2dd4bf', fontWeight: 700},
        'DE Interview Handbook',
      ),
      div({display: 'flex', flexDirection: 'column', width: CONTENT}, [
        div({display: 'flex', fontSize: 30, color: '#fbbf24', marginBottom: 20}, kicker),
        div(
          {
            display: 'block',
            width: CONTENT,
            fontSize: title.length > 34 ? 60 : 72,
            fontWeight: 700,
            lineHeight: 1.15,
          },
          title,
        ),
      ]),
      div(
        {display: 'flex', flexDirection: 'row', width: CONTENT},
        chips.map((c) =>
          div(
            {
              display: 'flex',
              fontSize: 24,
              padding: '6px 18px',
              borderRadius: 24,
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: '#2dd4bf',
              backgroundColor: '#12302d',
              marginRight: 14,
              color: '#e6f4f1',
            },
            c,
          ),
        ),
      ),
    ],
  );
}

async function render(el: El, file: string) {
  const svg = await satori(el as never, {width: 1200, height: 630, fonts});
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(
    file,
    new Resvg(svg, {fitTo: {mode: 'width', value: 1200}, font: {loadSystemFonts: false}})
      .render()
      .asPng(),
  );
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.mdx?$/.test(name) ? [p] : [];
  });
}

const docs = join(site, 'docs');
const LEVEL_NAMES: Record<string, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
};
let n = 0;
for (const file of files(docs)) {
  const text = readFileSync(file, 'utf8');
  const meta = parse(/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '') ?? {};
  const id = relative(docs, file)
    .replace(/\\/g, '/')
    .replace(/\.mdx?$/, '');
  const folder = dirname(id);
  const title: string = meta.title ?? /^# (.+)$/m.exec(text)?.[1] ?? id;
  const levels: string[] = Array.isArray(meta.levels) ? meta.levels : [];
  await render(
    card(
      title,
      SECTIONS[folder] ?? 'Handbook',
      levels.map((l) => LEVEL_NAMES[l] ?? l),
    ),
    join(out, `${id}.png`),
  );
  n++;
}
await render(
  card(
    'Practice for data engineering interviews',
    'SQL playground · DE 75 planner · Mock interviews',
    ['Junior', 'Mid', 'Senior', 'Lead'],
  ),
  join(out, 'default.png'),
);
console.log(`✓ ${n + 1} social images → apps/website/static/img/og`);
