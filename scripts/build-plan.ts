// Validates plans/de75.yaml against the question bank and emits apps/website/src/data/de75.json.
// Usage: node scripts/build-plan.ts   (run after build-questions.ts)
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

export const TARGETS: Record<string, number> = {
  sql: 30,
  python: 10,
  modeling: 10,
  'system-design': 10,
  tools: 10,
  behavioral: 5,
};
export const ROLES = new Set([
  'generalist',
  'analytics',
  'platform',
  'cloud',
  'etl',
  'warehouse',
  'streaming',
  'ml',
]);

type Item = {id?: unknown; round?: unknown; title?: unknown; planned?: unknown; roles?: unknown};
type Out = {id: string; round: string; planned?: true; title?: string; roles?: string[]};

export function loadPlan(
  doc: {items?: Item[]},
  questions: Map<string, {round: string}>,
): {items: Out[]; errors: string[]} {
  const errors: string[] = [];
  const items: Out[] = [];
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  for (const [i, it] of (doc.items ?? []).entries()) {
    const where = `item ${i + 1}${typeof it.id === 'string' ? ` (${it.id})` : ''}`;
    if (typeof it.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.id)) {
      errors.push(`${where}: id must be a slug`);
      continue;
    }
    if (seen.has(it.id)) errors.push(`${where}: duplicate id`);
    seen.add(it.id);
    const roles = it.roles === undefined ? undefined : it.roles;
    if (roles !== undefined && (!Array.isArray(roles) || !roles.every((r) => ROLES.has(r)))) {
      errors.push(`${where}: roles must be a list of ${[...ROLES].join('|')}`);
    }
    const q = questions.get(it.id);
    let round: string;
    if (it.planned === true) {
      if (q) errors.push(`${where}: question now exists; remove "planned" and its round/title`);
      if (typeof it.round !== 'string' || !(it.round in TARGETS)) {
        errors.push(`${where}: planned items need a valid round`);
        continue;
      }
      if (typeof it.title !== 'string' || !it.title)
        errors.push(`${where}: planned items need a title`);
      round = it.round;
      items.push({
        id: it.id,
        round,
        planned: true,
        title: String(it.title),
        roles: roles as string[],
      });
    } else {
      if (!q) {
        errors.push(`${where}: no question with this id (add it, or mark the item planned: true)`);
        continue;
      }
      if (it.round !== undefined || it.title !== undefined) {
        errors.push(`${where}: live items take round/title from the question; remove them`);
      }
      round = q.round;
      items.push({id: it.id, round, roles: roles as string[]});
    }
    counts[round] = (counts[round] ?? 0) + 1;
  }
  for (const [round, want] of Object.entries(TARGETS)) {
    if ((counts[round] ?? 0) !== want)
      errors.push(`round ${round}: ${counts[round] ?? 0} items, expected ${want}`);
  }
  return {items, errors};
}

/** plans/role-packs.yaml: `packs: {role: [question ids not in DE 75]}`. */
export function loadPacks(
  doc: {packs?: Record<string, unknown>} | null,
  questions: Map<string, unknown>,
  de75: Set<string>,
): {packs: Record<string, string[]>; errors: string[]} {
  const errors: string[] = [];
  const packs: Record<string, string[]> = {};
  for (const [role, ids] of Object.entries(doc?.packs ?? {})) {
    if (!ROLES.has(role)) {
      errors.push(`pack "${role}": unknown role (use ${[...ROLES].join('|')})`);
      continue;
    }
    if (!Array.isArray(ids)) {
      errors.push(`pack "${role}": must be a list of question ids`);
      continue;
    }
    const seen = new Set<string>();
    for (const id of ids) {
      if (typeof id !== 'string' || !questions.has(id))
        errors.push(`pack "${role}": no question with id ${JSON.stringify(id)}`);
      else if (de75.has(id))
        errors.push(`pack "${role}": ${id} is already in DE 75; tag it with roles there instead`);
      else if (seen.has(id)) errors.push(`pack "${role}": duplicate ${id}`);
      else seen.add(id);
    }
    packs[role] = [...seen];
  }
  return {packs, errors};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const bank = JSON.parse(
    readFileSync(join(root, 'apps/website/src/data/questions.json'), 'utf8'),
  ) as {id: string; round: string}[];
  const doc = parse(readFileSync(join(root, 'plans/de75.yaml'), 'utf8'));
  const {items, errors} = loadPlan(doc, new Map(bank.map((q) => [q.id, q])));
  if (errors.length) {
    console.error(`✗ ${errors.length} de75.yaml error(s):\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  const out = join(root, 'apps/website/src/data/de75.json');
  mkdirSync(dirname(out), {recursive: true});
  writeFileSync(out, JSON.stringify(items, null, 2) + '\n');
  const live = items.filter((i) => !i.planned).length;
  console.log(`✓ DE 75: ${live} / ${items.length} live → apps/website/src/data/de75.json`);

  const packDoc = parse(readFileSync(join(root, 'plans/role-packs.yaml'), 'utf8'));
  const ids = new Map(bank.map((q) => [q.id, q]));
  const {packs, errors: packErrors} = loadPacks(packDoc, ids, new Set(items.map((i) => i.id)));
  if (packErrors.length) {
    console.error(`✗ ${packErrors.length} role-packs.yaml error(s):\n  ${packErrors.join('\n  ')}`);
    process.exit(1);
  }
  writeFileSync(
    join(root, 'apps/website/src/data/role-packs.json'),
    JSON.stringify(packs, null, 2) + '\n',
  );
  const n = Object.values(packs).reduce((a, p) => a + p.length, 0);
  console.log(
    `✓ role packs: ${n} questions across ${Object.keys(packs).length} roles → apps/website/src/data/role-packs.json`,
  );
}
