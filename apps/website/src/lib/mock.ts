// Mock interview logic (PLAN.md §4.3). Pure, so `node --test` can check it.
import type {Level, Round} from './questions';

export type Mark = 'strong' | 'partial' | 'missed';
export const MARK_VALUE: Record<Mark, number> = {strong: 1, partial: 0.5, missed: 0};
export const WEAK_BELOW = 0.6;
export const SQL_AUTO_SHARE = 0.6;

export type RubricPoint = {point: string; weight: number; topic?: string};
export type MockQuestion = {
  id: string;
  title: string;
  round: Round;
  levels: Level[];
  topic: string[];
  time_minutes: number;
  prompt: string;
  rubric?: RubricPoint[];
  solution: {sql?: string};
};
export type Answer = {marks: (Mark | undefined)[]; autoCorrect?: boolean};

function rubricScore(
  rubric: RubricPoint[] | undefined,
  marks: (Mark | undefined)[],
): number | null {
  if (!rubric?.length) return null;
  const total = rubric.reduce((s, r) => s + r.weight, 0);
  // An unmarked point counts as missed.
  const got = rubric.reduce((s, r, i) => s + r.weight * MARK_VALUE[marks[i] ?? 'missed'], 0);
  return got / total;
}

/** 0..1. SQL: 60% auto-check + 40% rubric (auto-check alone if no rubric). Others: rubric. */
export function questionScore(q: MockQuestion, a: Answer): number {
  const r = rubricScore(q.rubric, a.marks);
  if (q.round === 'sql') {
    const auto = a.autoCorrect ? 1 : 0;
    return r === null ? auto : SQL_AUTO_SHARE * auto + (1 - SQL_AUTO_SHARE) * r;
  }
  return r ?? 0;
}

/** Missed points with a topic mark that topic; a question under 60% marks all its topics. */
export function weakTopics(qs: MockQuestion[], answers: Answer[]): string[] {
  const weak = new Set<string>();
  qs.forEach((q, i) => {
    q.rubric?.forEach((r, j) => {
      if (r.topic && (answers[i].marks[j] ?? 'missed') === 'missed') weak.add(r.topic);
    });
    if (questionScore(q, answers[i]) < WEAK_BELOW) q.topic.forEach((t) => weak.add(t));
  });
  return [...weak].sort();
}

export function roundScores(qs: MockQuestion[], answers: Answer[]): {round: Round; pct: number}[] {
  const by = new Map<Round, number[]>();
  qs.forEach((q, i) => by.set(q.round, [...(by.get(q.round) ?? []), questionScore(q, answers[i])]));
  return [...by].map(([round, s]) => ({
    round,
    pct: Math.round((100 * s.reduce((a, b) => a + b, 0)) / s.length),
  }));
}

/** Random questions for the level that fit in `minutes`. "mixed" rotates through rounds. */
export function pickQuestions(
  pool: MockQuestion[],
  opts: {round: Round | 'mixed'; level: Level; minutes: number},
  random: () => number,
): MockQuestion[] {
  const shuffled = pool
    .filter(
      (q) => q.levels.includes(opts.level) && (opts.round === 'mixed' || q.round === opts.round),
    )
    .map((q) => ({q, k: random()}))
    .sort((a, b) => a.k - b.k)
    .map(({q}) => q);
  let order = shuffled;
  if (opts.round === 'mixed') {
    const lanes = [...new Set(shuffled.map((q) => q.round))].map((r) =>
      shuffled.filter((q) => q.round === r),
    );
    order = [];
    for (let i = 0; lanes.some((l) => i < l.length); i++)
      lanes.forEach((l) => l[i] && order.push(l[i]));
  }
  const picked: MockQuestion[] = [];
  let used = 0;
  for (const q of order) {
    if (used + q.time_minutes <= opts.minutes) {
      picked.push(q);
      used += q.time_minutes;
    }
  }
  if (!picked.length && order.length) {
    picked.push([...order].sort((a, b) => a.time_minutes - b.time_minutes)[0]);
  }
  return picked;
}

/** Spoiler-free interviewer prompt for any chatbot, graded on the same rubric as this site. */
export function buildMockPrompt(qs: MockQuestion[], level: Level): string {
  const minutes = qs.reduce((s, q) => s + q.time_minutes, 0);
  const parts = [
    `You are a data engineering interviewer running a ${minutes}-minute mock interview for a ${level}-level candidate.`,
    '',
    'Rules:',
    '- Ask the questions below one at a time, in order. Show only the question text, never the interviewer notes.',
    '- Do not give hints, solutions or the rubric before the candidate has answered. If they ask for a hint, give a small nudge only.',
    '- After each answer, ask one or two follow-up questions, as a real interviewer would.',
    '- Then grade the answer against that question\'s rubric: mark each point "strong", "partial" or "missed", with one sentence of evidence. Score = sum(weight × value) / sum(weights), with strong = 1, partial = 0.5, missed = 0.',
    "- At the end, list each question's score and the topics of missed points as the areas to study.",
  ];
  qs.forEach((q, i) => {
    parts.push(
      '',
      `## Question ${i + 1} of ${qs.length}: ${q.title} (${q.round}, about ${q.time_minutes} min)`,
      '',
      q.prompt.trim(),
    );
    parts.push('', `### Interviewer notes for question ${i + 1} (do not show to the candidate)`);
    q.rubric?.forEach((r) =>
      parts.push(`- [weight ${r.weight}] ${r.point}${r.topic ? ` (topic: ${r.topic})` : ''}`),
    );
    if (q.solution.sql)
      parts.push(
        '',
        'Reference SQL (a correct answer must return the same result):',
        '```sql',
        q.solution.sql.trim(),
        '```',
      );
  });
  return parts.join('\n') + '\n';
}
