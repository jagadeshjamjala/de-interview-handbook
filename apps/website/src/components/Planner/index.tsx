import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useHistory, useLocation} from '@docusaurus/router';
import de75 from '@site/src/data/de75.json';
import {LEVELS, ROUND_LABELS, type Level, type Round} from '@site/src/lib/questions';
import {indexById as questionsById} from '@site/src/lib/questionIndex';
import {
  COST_FACTOR,
  ROLE_LABELS,
  ROUND_ORDER,
  WEEKDAYS,
  addDays,
  buildPlan,
  defaults,
  parseParams,
  studySessions,
  toParams,
  type PlanInput,
  type PlanItem,
  type Role,
  type Weekday,
} from '@site/src/lib/plan';
import {buildIcs} from '@site/src/lib/ics';
import {levelStore, plannerStore, progressStore} from '@site/src/lib/store';
import styles from './styles.module.css';

const items = de75 as PlanItem[];
const liveRounds = ROUND_ORDER.filter((r) => items.some((i) => !i.planned && i.round === r));
const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/** Planner settings a debrief or a saved session can build on. */
export function plannerBase(): PlanInput {
  const base = defaults(new Date(), liveRounds);
  return {...base, level: levelStore.get() ?? base.level, ...(plannerStore.get() ?? {})};
}

function fmtDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export default function Planner(): ReactNode {
  const location = useLocation();
  const history = useHistory();
  const [input, setInput] = useState<PlanInput>(() => parseParams(location.search, plannerBase()));
  const progress = progressStore.use();
  const [copied, setCopied] = useState(false);
  const questionsUrl = useBaseUrl('/questions', {absolute: true});

  // Keep the URL canonical so "Copy link" always reproduces exactly this plan.
  useEffect(() => {
    const search = `?${toParams(input)}`;
    if (location.search !== search) history.replace({search});
  }, [input, location.search, history]);

  const update = (patch: Partial<PlanInput>) => {
    const next = {...input, ...patch};
    setInput(next);
    plannerStore.set(next);
  };
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const plan = buildPlan(input, items, questionsById);
  const scheduledIds = plan.weeks.flatMap((w) => w.items);
  const byRound = ROUND_ORDER.map((r) => {
    const ids = scheduledIds.filter((id) => questionsById.get(id)?.round === r);
    return {round: r, total: ids.length, done: ids.filter((id) => progress[id]).length};
  }).filter((r) => r.total > 0);

  const setDone = (id: string, done: boolean) => {
    const next = {...progressStore.get()};
    if (done) next[id] = true;
    else delete next[id];
    progressStore.set(next);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked: the URL bar has the same link
    }
  };

  const downloadIcs = () => {
    const events = plan.weeks.flatMap((w, wi) =>
      w.items.length === 0
        ? []
        : studySessions(input, wi).map((s) => ({
            uid: `de75-${input.start}-w${wi + 1}-${s.date}@de-interview-handbook`,
            date: s.date,
            time: input.time,
            minutes: s.minutes,
            summary: `DE 75 study · week ${wi + 1}`,
            description: w.items
              .map((id) => `${questionsById.get(id)?.title} ${questionsUrl}#${id}`)
              .join('\n'),
          })),
    );
    const blob = new Blob([buildIcs(events, new Date())], {type: 'text/calendar'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `de75-plan-${input.start}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className={styles.planner}>
      <p className={styles.counter}>
        <strong>
          {plan.live} / {plan.total}
        </strong>{' '}
        DE 75 questions live.
        {plan.live < plan.total && (
          <>
            {' '}
            The rest are on the <Link to="/docs/start-here/roadmap">roadmap</Link>.
          </>
        )}
      </p>

      <form className={styles.form} onSubmit={(e) => e.preventDefault()} aria-label="Plan settings">
        <label>
          <span>Level</span>
          <select value={input.level} onChange={(e) => update({level: e.target.value as Level})}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Role type</span>
          <select value={input.role} onChange={(e) => update({role: e.target.value as Role})}>
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Weeks (2–12)</span>
          <input
            type="number"
            min={2}
            max={12}
            value={input.weeks}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 2 && n <= 12) update({weeks: n});
            }}
          />
        </label>
        <label>
          <span>Hours per week</span>
          <input
            type="number"
            min={1}
            max={40}
            value={input.hours}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= 40) update({hours: n});
            }}
          />
        </label>
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={input.start}
            onChange={(e) => e.target.value && update({start: e.target.value})}
          />
        </label>
        <label>
          <span>Start time</span>
          <input
            type="time"
            value={input.time}
            onChange={(e) => e.target.value && update({time: e.target.value})}
          />
        </label>
        <fieldset>
          <legend>Study days</legend>
          {WEEKDAYS.map((d) => (
            <label key={d} className={styles.check}>
              <input
                type="checkbox"
                checked={input.days.includes(d)}
                disabled={input.days.length === 1 && input.days.includes(d)}
                onChange={() =>
                  update({days: WEEKDAYS.filter((x) => toggle(input.days, d).includes(x))})
                }
              />
              {DAY_LABELS[d]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Focus areas</legend>
          {liveRounds.map((r) => (
            <label key={r} className={styles.check}>
              <input
                type="checkbox"
                checked={input.focus.includes(r)}
                disabled={input.focus.length === 1 && input.focus.includes(r)}
                onChange={() =>
                  update({focus: ROUND_ORDER.filter((x) => toggle(input.focus, r).includes(x))})
                }
              />
              {ROUND_LABELS[r]}
            </label>
          ))}
        </fieldset>
      </form>

      {input.weak.length > 0 && (
        <p className={styles.weak}>
          Prioritizing weak topics (from your mock interview or skill radar):{' '}
          {input.weak.map((t) => (
            <code key={t}>{t}</code>
          ))}{' '}
          <button
            type="button"
            className="button button--sm button--link"
            onClick={() => update({weak: []})}
          >
            Clear
          </button>
        </p>
      )}

      <p aria-live="polite">
        <strong>{plan.scheduled}</strong> questions over {input.weeks} weeks, {input.hours} h a week
        ({COST_FACTOR}× each question's time: one attempt plus review).
        {plan.didNotFit > 0 &&
          ` ${plan.didNotFit} more match your filters but don't fit; add hours or weeks to include them.`}
      </p>

      <div className={styles.actions}>
        <button type="button" className="button button--primary" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy link to this plan'}
        </button>
        <button type="button" className="button button--secondary" onClick={downloadIcs}>
          Download calendar (.ics)
        </button>
      </div>

      {byRound.length > 0 && (
        <div className={styles.progress} aria-label="Progress per round">
          {byRound.map((r) => (
            <label key={r.round}>
              <span>
                {ROUND_LABELS[r.round as Round]}: {r.done} / {r.total}
              </span>
              <progress max={r.total} value={r.done} />
            </label>
          ))}
        </div>
      )}

      {plan.weeks.map((w, wi) => {
        const from = addDays(input.start, wi * 7);
        const sessions = studySessions(input, wi);
        return (
          <section key={wi} className={styles.week}>
            <Heading as="h2" className={styles.weekTitle}>
              Week {wi + 1}{' '}
              <span className={styles.muted}>
                {fmtDate(from)} – {fmtDate(addDays(from, 6))}
              </span>
            </Heading>
            <p className={styles.muted}>
              {sessions
                .map((s) => `${fmtDate(s.date)} ${input.time} (${s.minutes} min)`)
                .join(' · ')}
            </p>
            {w.items.length === 0 ? (
              <p>Buffer week: redo the questions where you missed rubric points.</p>
            ) : (
              <ul className={styles.items}>
                {w.items.map((id) => {
                  const q = questionsById.get(id)!;
                  return (
                    <li key={id}>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={Boolean(progress[id])}
                          onChange={(e) => setDone(id, e.target.checked)}
                          aria-label={`Mark "${q.title}" done`}
                        />
                      </label>
                      <Link
                        to={`/questions#${id}`}
                        className={progress[id] ? styles.done : undefined}
                      >
                        {q.title}
                      </Link>{' '}
                      <span className={styles.muted}>
                        {ROUND_LABELS[q.round]} · {q.difficulty} · {q.time_minutes * COST_FACTOR}{' '}
                        min
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
