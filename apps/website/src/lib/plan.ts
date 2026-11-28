// DE 75 planner logic (PLAN.md §4.2). Pure functions, no imports at runtime, so the same input
// always gives the same plan and `node --test` can check it.
import type {Difficulty, Level, Round} from './questions';

export type Role =
  'generalist' | 'analytics' | 'platform' | 'cloud' | 'etl' | 'warehouse' | 'streaming' | 'ml';
/** Extra bank questions (not in DE 75) added to the plan for a role: plans/role-packs.yaml. */
export type RolePacks = Partial<Record<Role, string[]>>;
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type PlanItem = {
  id: string;
  round: Round;
  planned?: boolean;
  title?: string;
  roles?: Role[];
};
export type PlanQuestion = {
  id: string;
  round: Round;
  levels: Level[];
  difficulty: Difficulty;
  topic: string[];
  time_minutes: number;
};
export type PlanInput = {
  level: Level;
  weeks: number;
  hours: number;
  focus: Round[];
  role: Role;
  start: string; // YYYY-MM-DD
  days: Weekday[];
  time: string; // HH:MM
  weak: string[];
};
export type Plan = {
  weeks: {items: string[]; minutes: number}[];
  scheduled: number;
  didNotFit: number;
  live: number;
  total: number;
};

export const LEVEL_VALUES: Level[] = ['junior', 'mid', 'senior', 'lead'];
export const ROLE_LABELS: Record<Role, string> = {
  generalist: 'Data Engineer (generalist)',
  analytics: 'Analytics Eng',
  platform: 'Platform DE',
  cloud: 'Cloud Data Engineer',
  etl: 'ETL / Integration Eng',
  warehouse: 'Data Warehouse Eng',
  streaming: 'Streaming DE',
  ml: 'ML Data Eng',
};
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const ROUND_ORDER: Round[] = [
  'sql',
  'python',
  'modeling',
  'system-design',
  'tools',
  'behavioral',
];
/** Minutes planned per question: one attempt plus reviewing the solution and rubric. */
export const COST_FACTOR = 2;

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const addDays = (s: string, n: number) =>
  ymd(new Date(parseYmd(s).getTime() + n * 86_400_000));

/** The first Monday strictly after `today` (local calendar date). */
export function nextMonday(today: Date): string {
  const base = ymd(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const dow = parseYmd(base).getUTCDay(); // 0 = Sunday
  return addDays(base, (8 - dow) % 7 || 7);
}

export function defaults(today: Date, liveRounds: Round[]): PlanInput {
  return {
    level: 'mid',
    weeks: 6,
    hours: 5,
    focus: ROUND_ORDER.filter((r) => liveRounds.includes(r)),
    role: 'generalist',
    start: nextMonday(today),
    days: ['sat', 'sun'],
    time: '09:00',
    weak: [],
  };
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s;

/** URL → input. Anything missing or invalid falls back to `base`. */
export function parseParams(search: string, base: PlanInput): PlanInput {
  const p = new URLSearchParams(search);
  const int = (k: string, lo: number, hi: number, d: number) => {
    const n = Number(p.get(k));
    return p.has(k) && Number.isInteger(n) && n >= lo && n <= hi ? n : d;
  };
  const level = p.get('level') as Level;
  const role = p.get('role') as Role;
  const focus = ROUND_ORDER.filter((r) => list(p.get('focus')).includes(r));
  const days = WEEKDAYS.filter((d) => list(p.get('days')).includes(d));
  const start = p.get('start') ?? '';
  const time = p.get('time') ?? '';
  const weak = list(p.get('w')).filter((t) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(t));
  return {
    level: LEVEL_VALUES.includes(level) ? level : base.level,
    weeks: int('weeks', 2, 12, base.weeks),
    hours: int('hours', 1, 40, base.hours),
    focus: p.has('focus') && focus.length ? focus : base.focus,
    role: role in ROLE_LABELS ? role : base.role,
    start: validDate(start) ? start : base.start,
    days: p.has('days') && days.length ? days : base.days,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : base.time,
    weak: p.has('w') ? [...new Set(weak)].sort() : base.weak,
  };
}

/** Input → canonical query string (fixed key and value order, so equal plans give equal links). */
export function toParams(i: PlanInput): string {
  const p = new URLSearchParams();
  p.set('level', i.level);
  p.set('weeks', String(i.weeks));
  p.set('hours', String(i.hours));
  p.set('focus', ROUND_ORDER.filter((r) => i.focus.includes(r)).join(','));
  p.set('role', i.role);
  p.set('start', i.start);
  p.set('days', WEEKDAYS.filter((d) => i.days.includes(d)).join(','));
  p.set('time', i.time);
  if (i.weak.length) p.set('w', [...new Set(i.weak)].sort().join(','));
  return p.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
}

/**
 * 1. Keep live items for the chosen level and focus rounds, in curated de75.yaml order.
 * 2. If they don't all fit in weeks × hours, keep the highest priority ones: weak topics (+3),
 *    the chosen role (+2), hard / design / behavioral items for senior and lead (+1); ties keep
 *    curated order.
 * 3. Schedule the kept items in curated order, filling each week's hours before the next.
 */
export function buildPlan(
  input: PlanInput,
  items: PlanItem[],
  byId: Map<string, PlanQuestion>,
  extra: PlanItem[] = [], // the chosen role's pack, after DE 75 in study order
): Plan {
  const live = items.filter((it) => !it.planned && byId.has(it.id));
  const candidates = [...live, ...extra.filter((it) => byId.has(it.id))]
    .map((it, order) => ({it, q: byId.get(it.id)!, order}))
    .filter(({q}) => q.levels.includes(input.level) && input.focus.includes(q.round));
  const senior = input.level === 'senior' || input.level === 'lead';
  const score = ({it, q}: (typeof candidates)[number]) =>
    (q.topic.some((t) => input.weak.includes(t)) ? 3 : 0) +
    (it.roles?.includes(input.role) ? 2 : 0) +
    (senior && (q.difficulty === 'hard' || q.round === 'system-design' || q.round === 'behavioral')
      ? 1
      : 0);

  const budget = input.weeks * input.hours * 60;
  const kept = new Set<string>();
  let used = 0;
  for (const c of [...candidates].sort((a, b) => score(b) - score(a) || a.order - b.order)) {
    const cost = c.q.time_minutes * COST_FACTOR;
    if (used + cost <= budget) {
      kept.add(c.it.id);
      used += cost;
    }
  }

  const perWeek = input.hours * 60;
  const weeks = Array.from({length: input.weeks}, () => ({items: [] as string[], minutes: 0}));
  let w = 0;
  for (const {it, q} of candidates.filter((c) => kept.has(c.it.id))) {
    const cost = q.time_minutes * COST_FACTOR;
    if (weeks[w].minutes > 0 && weeks[w].minutes + cost > perWeek && w < weeks.length - 1) w++;
    weeks[w].items.push(it.id);
    weeks[w].minutes += cost;
  }
  return {
    weeks,
    scheduled: kept.size,
    didNotFit: candidates.length - kept.size,
    live: live.length,
    total: items.length,
  };
}

/** Study sessions for week `week` (0-based): one per chosen weekday, hours split evenly. */
export function studySessions(i: PlanInput, week: number): {date: string; minutes: number}[] {
  if (!i.days.length) return [];
  const minutes = Math.round((i.hours * 60) / i.days.length);
  const out: {date: string; minutes: number}[] = [];
  for (let d = 0; d < 7; d++) {
    const date = addDays(i.start, week * 7 + d);
    const dow = WEEKDAYS[(parseYmd(date).getUTCDay() + 6) % 7];
    if (i.days.includes(dow)) out.push({date, minutes});
  }
  return out;
}

/** The role's pack as plan items (tagged with the role, so they get its priority bonus). */
export function packItems(
  role: Role,
  packs: RolePacks,
  byId: Map<string, {round: PlanItem['round']}>,
): PlanItem[] {
  return (packs[role] ?? [])
    .filter((id) => byId.has(id))
    .map((id) => ({id, round: byId.get(id)!.round, roles: [role]}));
}

/** Every question tied to a role: DE 75 items tagged with it, plus its pack. */
export function roleQuestionIds(role: Role, items: PlanItem[], packs: RolePacks): Set<string> {
  return new Set([
    ...items.filter((it) => !it.planned && it.roles?.includes(role)).map((it) => it.id),
    ...(packs[role] ?? []),
  ]);
}
