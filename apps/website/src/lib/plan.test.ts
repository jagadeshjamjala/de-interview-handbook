import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPlan,
  defaults,
  nextMonday,
  parseParams,
  studySessions,
  toParams,
  type PlanItem,
  type PlanQuestion,
} from './plan.ts';
import {buildIcs, fold} from './ics.ts';

const q = (id: string, over: Partial<PlanQuestion> = {}): PlanQuestion => ({
  id,
  round: 'sql',
  levels: ['junior', 'mid', 'senior'],
  difficulty: 'easy',
  topic: ['t'],
  time_minutes: 30,
  ...over,
});
const qs = [
  q('a'),
  q('b', {topic: ['gaps-and-islands']}),
  q('c', {round: 'modeling'}),
  q('d', {difficulty: 'hard', levels: ['senior']}),
  q('e'),
];
const byId = new Map(qs.map((x) => [x.id, x]));
const items: PlanItem[] = [
  {id: 'a', round: 'sql'},
  {id: 'b', round: 'sql'},
  {id: 'c', round: 'modeling', roles: ['analytics']},
  {id: 'd', round: 'sql'},
  {id: 'e', round: 'sql'},
  {id: 'future', round: 'tools', planned: true, title: 'Later'},
];
const base = {...defaults(new Date(2024, 4, 15), ['sql', 'modeling']), weeks: 2, hours: 1};

test('nextMonday is strictly after today', () => {
  assert.equal(nextMonday(new Date(2024, 4, 15)), '2024-05-20'); // Wednesday -> next Monday
  assert.equal(nextMonday(new Date(2024, 4, 20)), '2024-05-27'); // Monday -> the following one
  assert.equal(nextMonday(new Date(2024, 4, 19)), '2024-05-20'); // Sunday -> tomorrow
});

test('params round-trip and the link reproduces the plan', () => {
  const input = {...base, weak: ['z-topic', 'gaps-and-islands', 'z-topic']};
  const link = toParams(input);
  const parsed = parseParams(link, defaults(new Date(2030, 0, 1), ['sql']));
  assert.equal(toParams(parsed), link);
  assert.deepEqual(buildPlan(parsed, items, byId), buildPlan(input, items, byId));
  assert.match(link, /w=gaps-and-islands,z-topic/);
});

test('invalid params fall back to defaults', () => {
  const p = parseParams('level=intern&weeks=99&start=2024-02-31&time=25:00&days=xyz&focus=', base);
  assert.equal(p.level, base.level);
  assert.equal(p.weeks, base.weeks);
  assert.equal(p.start, base.start);
  assert.equal(p.time, base.time);
  assert.deepEqual(p.days, base.days);
  assert.deepEqual(p.focus, base.focus);
});

test('filters by level and focus, hides planned items, keeps curated order', () => {
  const plan = buildPlan({...base, level: 'mid', weeks: 12, hours: 40}, items, byId);
  assert.deepEqual(
    plan.weeks.flatMap((w) => w.items),
    ['a', 'b', 'c', 'e'],
  ); // d is senior-only
  assert.equal(plan.live, 5);
  assert.equal(plan.total, 6);
  const sqlOnly = buildPlan({...base, focus: ['sql'], weeks: 12, hours: 40}, items, byId);
  assert.ok(!sqlOnly.weeks.flatMap((w) => w.items).includes('c'));
});

test('budget: weeks x hours, 2x question time; fills weeks in order', () => {
  // 2 weeks x 1h = 120 min; each question costs 60 -> 2 fit, 1 per week
  const plan = buildPlan({...base, level: 'mid', role: 'platform'}, items, byId); // no role bonus
  assert.equal(plan.scheduled, 2);
  assert.equal(plan.didNotFit, 2);
  assert.deepEqual(
    plan.weeks.map((w) => w.items),
    [['a'], ['b']],
  );
});

test('weak topics and role win the limited slots', () => {
  const weak = buildPlan(
    {...base, level: 'mid', weak: ['gaps-and-islands'], role: 'platform'},
    items,
    byId,
  );
  assert.ok(weak.weeks.flatMap((w) => w.items).includes('b'));
  const role = buildPlan({...base, level: 'mid', role: 'analytics'}, items, byId);
  assert.deepEqual(
    role.weeks.flatMap((w) => w.items),
    ['a', 'c'],
  ); // c gets the role bonus, order kept
});

test('senior gets hard items weighted up', () => {
  const plan = buildPlan({...base, level: 'senior', hours: 1, weeks: 2}, items, byId);
  assert.ok(plan.weeks.flatMap((w) => w.items).includes('d'));
});

test('study sessions split hours across chosen days', () => {
  const s = studySessions({...base, start: '2024-05-20', days: ['sat', 'sun'], hours: 5}, 1);
  assert.deepEqual(s, [
    {date: '2024-06-01', minutes: 150},
    {date: '2024-06-02', minutes: 150},
  ]);
  assert.deepEqual(studySessions({...base, days: []}, 0), []);
});

test('ics: valid structure, escaping, floating times, folding', () => {
  const ics = buildIcs(
    [
      {
        uid: 'w1-1@deih',
        date: '2024-06-01',
        time: '23:30',
        minutes: 90,
        summary: 'DE study, week 1; SQL',
        description: 'line one\nline two ' + 'x'.repeat(120),
      },
    ],
    new Date(Date.UTC(2024, 4, 1, 12, 0, 0)),
  );
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /DTSTART:20240601T233000\r\n/);
  assert.match(ics, /DTEND:20240602T010000\r\n/); // crosses midnight
  assert.match(ics, /SUMMARY:DE study\\, week 1\\; SQL/);
  assert.match(ics, /line one\\nline two/);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal(fold('é'.repeat(50)).split('\r\n ').join(''), 'é'.repeat(50)); // no split characters
});

test('generalist is the default role; links with other roles still parse', () => {
  const base = defaults(new Date(2024, 0, 3), ['sql']);
  assert.equal(base.role, 'generalist');
  assert.equal(parseParams('?role=analytics', base).role, 'analytics');
  assert.equal(parseParams('?role=nope', base).role, 'generalist');
});
