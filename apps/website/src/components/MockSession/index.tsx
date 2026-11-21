import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import SqlPlayground from '@site/src/components/SqlPlayground';
import {formatClock} from '@site/src/components/CardTimer';
import {plannerBase} from '@site/src/components/Planner';
import {LEVELS, ROUND_LABELS, type Level, type Question, type Round} from '@site/src/lib/questions';
import {questions, questionsById} from '@site/src/lib/questionBank';
import {
  buildMockPrompt,
  pickQuestions,
  questionScore,
  roundScores,
  weakTopics,
  type Answer,
  type Mark,
} from '@site/src/lib/mock';
import {toParams} from '@site/src/lib/plan';
import {levelStore} from '@site/src/lib/store';
import styles from './styles.module.css';

type RoundChoice = Round | 'mixed';
const ROUNDS: RoundChoice[] = [
  'mixed',
  'sql',
  'python',
  'modeling',
  'system-design',
  'tools',
  'behavioral',
];
const LENGTHS = [30, 45, 60];
const MARKS: Mark[] = ['strong', 'partial', 'missed'];

type Session = {
  ids: string[];
  minutes: number;
  level: Level;
  endsAt: number;
  answers: Answer[];
  notes: string[];
};

function Html({html}: {html: string}): ReactNode {
  // Pre-rendered at build time by markdown-it with raw HTML escaped.
  return <div dangerouslySetInnerHTML={{__html: html}} />;
}

function Builder({onStart}: {onStart: (s: Session) => void}): ReactNode {
  const saved = levelStore.use();
  const [round, setRound] = useState<RoundChoice>('mixed');
  const [level, setLevel] = useState<Level>(saved ?? 'mid');
  const [minutes, setMinutes] = useState(45);
  const [copied, setCopied] = useState<string | null>(null);
  const pick = () => pickQuestions(questions, {round, level, minutes}, Math.random);

  const copyPrompt = async () => {
    const qs = pick();
    try {
      await navigator.clipboard.writeText(buildMockPrompt(qs, level));
      setCopied(
        `Copied an interviewer prompt with ${qs.length} questions. Paste it into any AI chat.`,
      );
    } catch {
      setCopied('Your browser blocked the clipboard. Allow clipboard access and try again.');
    }
  };

  return (
    <form
      className={styles.builder}
      onSubmit={(e) => e.preventDefault()}
      aria-label="Mock interview settings"
    >
      <label>
        <span>Round</span>
        <select value={round} onChange={(e) => setRound(e.target.value as RoundChoice)}>
          {ROUNDS.map((r) => (
            <option key={r} value={r}>
              {r === 'mixed' ? 'Mixed' : ROUND_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Level</span>
        <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Length</legend>
        {LENGTHS.map((m) => (
          <label key={m} className={styles.inline}>
            <input
              type="radio"
              name="length"
              checked={minutes === m}
              onChange={() => setMinutes(m)}
            />{' '}
            {m} min
          </label>
        ))}
      </fieldset>
      <div className={styles.actions}>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            const qs = pick();
            onStart({
              ids: qs.map((q) => q.id),
              minutes,
              level,
              endsAt: Date.now() + minutes * 60_000,
              answers: qs.map(() => ({marks: []})),
              notes: qs.map(() => ''),
            });
          }}
        >
          Start mock interview
        </button>
        <button type="button" className="button button--secondary" onClick={copyPrompt}>
          Copy as AI mock prompt
        </button>
      </div>
      {copied && <p role="status">{copied}</p>}
    </form>
  );
}

function Running({
  s,
  set,
  onFinish,
}: {
  s: Session;
  set: (s: Session) => void;
  onFinish: () => void;
}): ReactNode {
  const [i, setI] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= s.endsAt) onFinish();
    }, 1000);
    return () => clearInterval(t);
  }, [s.endsAt, onFinish]);

  const q = questionsById.get(s.ids[i])!;
  const last = i === s.ids.length - 1;
  const setNote = (text: string) => set({...s, notes: s.notes.map((n, j) => (j === i ? text : n))});
  return (
    <div>
      <div className={styles.bar}>
        <span>
          Question {i + 1} of {s.ids.length} · {ROUND_LABELS[q.round]} · suggested {q.time_minutes}{' '}
          min
        </span>
        <span role="timer" className={styles.clock}>
          {formatClock((s.endsAt - now) / 1000)} left
        </span>
      </div>
      <Heading as="h2">{q.title}</Heading>
      <Html html={q.html.prompt} />
      {q.tests && (
        <details>
          <summary>Example tests</summary>
          <CodeBlock language="python">{q.tests.trimEnd()}</CodeBlock>
        </details>
      )}
      {q.round === 'sql' ? (
        <SqlPlayground
          key={q.id}
          question={q}
          onVerdict={(v, sql) =>
            set({
              ...s,
              answers: s.answers.map((a, j) => (j === i ? {...a, autoCorrect: v.ok} : a)),
              notes: s.notes.map((n, j) => (j === i ? sql : n)),
            })
          }
        />
      ) : (
        <label className={styles.answer}>
          <span>Your answer (notes, outline or code)</span>
          <textarea rows={12} value={s.notes[i]} onChange={(e) => setNote(e.target.value)} />
        </label>
      )}
      <div className={styles.actions}>
        {!last && (
          <button type="button" className="button button--primary" onClick={() => setI(i + 1)}>
            Next question
          </button>
        )}
        <button
          type="button"
          className={`button ${last ? 'button--primary' : 'button--secondary'}`}
          onClick={onFinish}
        >
          {last ? 'Finish and review' : 'End early and review'}
        </button>
      </div>
    </div>
  );
}

function Review({
  s,
  set,
  onDone,
}: {
  s: Session;
  set: (s: Session) => void;
  onDone: () => void;
}): ReactNode {
  const qs = s.ids.map((id) => questionsById.get(id)!);
  const mark = (qi: number, pi: number, m: Mark) =>
    set({
      ...s,
      answers: s.answers.map((a, j) => {
        if (j !== qi) return a;
        const marks = [...a.marks];
        marks[pi] = m;
        return {...a, marks};
      }),
    });
  const unmarked = qs.reduce(
    (n, q, qi) => n + (q.rubric ?? []).filter((_, pi) => !s.answers[qi].marks[pi]).length,
    0,
  );
  return (
    <div>
      <p>
        Compare each answer with the model answer, then mark every rubric point{' '}
        <strong>strong</strong>, <strong>partial</strong> or <strong>missed</strong>. Be strict: the
        missed points become your study list.
      </p>
      {qs.map((q, qi) => (
        <section key={q.id} className={styles.review}>
          <Heading as="h2">
            {qi + 1}. {q.title}
          </Heading>
          {q.round === 'sql' && (
            <p className={s.answers[qi].autoCorrect ? styles.ok : styles.bad}>
              Auto-check:{' '}
              {s.answers[qi].autoCorrect === undefined
                ? 'not checked (counts as wrong)'
                : s.answers[qi].autoCorrect
                  ? '✅ correct'
                  : '❌ wrong result'}
            </p>
          )}
          {s.notes[qi] && (
            <details>
              <summary>Your answer</summary>
              <pre className={styles.pre}>{s.notes[qi]}</pre>
            </details>
          )}
          <details open>
            <summary>Model answer</summary>
            {q.solution.sql && <CodeBlock language="sql">{q.solution.sql.trimEnd()}</CodeBlock>}
            {q.solution.python && (
              <CodeBlock language="python">{q.solution.python.trimEnd()}</CodeBlock>
            )}
            {q.html.answer && <Html html={q.html.answer} />}
            {q.html.explanation && <Html html={q.html.explanation} />}
          </details>
          {(q.rubric ?? []).map((r, pi) => (
            <fieldset key={r.point} className={styles.point}>
              <legend>
                {r.point} <span className={styles.muted}>(weight {r.weight})</span>
              </legend>
              {MARKS.map((m) => (
                <label key={m} className={styles.inline}>
                  <input
                    type="radio"
                    name={`${q.id}-${pi}`}
                    checked={s.answers[qi].marks[pi] === m}
                    onChange={() => mark(qi, pi, m)}
                  />{' '}
                  {m}
                </label>
              ))}
            </fieldset>
          ))}
        </section>
      ))}
      <div className={styles.actions}>
        <button
          type="button"
          className="button button--primary"
          disabled={unmarked > 0}
          onClick={onDone}
        >
          See debrief
        </button>
        {unmarked > 0 && (
          <span className={styles.muted}>{unmarked} rubric points left to mark</span>
        )}
      </div>
    </div>
  );
}

function Debrief({s, onRestart}: {s: Session; onRestart: () => void}): ReactNode {
  const qs = s.ids.map((id) => questionsById.get(id)!) as Question[];
  const scores = qs.map((q, i) => questionScore(q, s.answers[i]));
  const overall = Math.round((100 * scores.reduce((a, b) => a + b, 0)) / scores.length);
  const weak = weakTopics(qs, s.answers);
  const base = plannerBase();
  const plannerLink = `/planner?${toParams({...base, level: s.level, weak: [...new Set([...base.weak, ...weak])]})}`;
  return (
    <div>
      <p className={styles.score}>
        Overall: <strong>{overall}%</strong>
      </p>
      <ul>
        {roundScores(qs, s.answers).map((r) => (
          <li key={r.round}>
            {ROUND_LABELS[r.round]}: {r.pct}%
          </li>
        ))}
      </ul>
      <Heading as="h2">Per question</Heading>
      <ul>
        {qs.map((q, i) => (
          <li key={q.id}>
            <Link to={`/questions#${q.id}`}>{q.title}</Link>: {Math.round(scores[i] * 100)}%
          </li>
        ))}
      </ul>
      <Heading as="h2">Weak topics</Heading>
      {weak.length ? (
        <p>
          {weak.map((t) => (
            <code key={t} className={styles.topic}>
              {t}
            </code>
          ))}
        </p>
      ) : (
        <p>None this time. Try a harder round or the next level up.</p>
      )}
      <div className={styles.actions}>
        {weak.length > 0 && (
          <Link className="button button--primary" to={plannerLink}>
            Add weak topics to my planner
          </Link>
        )}
        <button type="button" className="button button--secondary" onClick={onRestart}>
          New mock interview
        </button>
      </div>
    </div>
  );
}

// Session state lives in memory only: a mock is meant to be done in one sitting.
export default function MockSession(): ReactNode {
  const [stage, setStage] = useState<'build' | 'run' | 'review' | 'debrief'>('build');
  const [session, setSession] = useState<Session | null>(null);
  const [finish] = useState(() => () => setStage((st) => (st === 'run' ? 'review' : st)));
  if (stage === 'build' || !session) {
    return (
      <Builder
        onStart={(s) => {
          setSession(s);
          setStage('run');
        }}
      />
    );
  }
  if (stage === 'run') return <Running s={session} set={setSession} onFinish={finish} />;
  if (stage === 'review')
    return <Review s={session} set={setSession} onDone={() => setStage('debrief')} />;
  return (
    <Debrief
      s={session}
      onRestart={() => {
        setSession(null);
        setStage('build');
      }}
    />
  );
}
