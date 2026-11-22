import {useEffect, useRef, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import {useLocation} from '@docusaurus/router';
import {DRILLS, type Choice, type Drill, type Verdict} from '@site/src/data/drills';
import {indexById} from '@site/src/lib/questionIndex';
import styles from './styles.module.css';

const VERDICT: Record<Verdict, {icon: string; label: string}> = {
  best: {icon: '✓', label: 'Strong move'},
  ok: {icon: '~', label: 'Reasonable, not the best'},
  weak: {icon: '✗', label: 'Weak move, try again'},
};

/** `**bold**` and `` `code` `` only; drill text is our own data, never HTML. */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .map((part, i) =>
      part.startsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith('`') ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}

function Feedback({choice}: {choice: Choice}) {
  const v = VERDICT[choice.verdict];
  return (
    <div className={`${styles.feedback} ${styles[choice.verdict]}`}>
      <p className={styles.move}>You: {choice.label}</p>
      <p>
        <strong>
          <span aria-hidden="true">{v.icon} </span>
          {v.label}.
        </strong>{' '}
        {choice.why}
      </p>
    </div>
  );
}

function Run({drill}: {drill: Drill}) {
  const [moves, setMoves] = useState<{step: string; choice: Choice}[]>([]);
  const current = moves.length ? moves[moves.length - 1].choice.next : drill.start;
  const step = drill.steps[current];
  const retrying = moves.length > 0 && moves[moves.length - 1].step === current;
  const tried = new Set(moves.filter((m) => m.step === current).map((m) => m.choice.label));
  const focusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (moves.length) focusRef.current?.focus();
  }, [moves.length]);

  const firstTry = new Map<string, Verdict>();
  for (const m of moves) if (!firstTry.has(m.step)) firstTry.set(m.step, m.choice.verdict);
  const best = [...firstTry.values()].filter((v) => v === 'best').length;

  return (
    <article className={styles.run}>
      {moves.map((m, i) => (
        <section key={i} className={styles.past}>
          {(i === 0 || moves[i - 1].step !== m.step) && <p>{inline(drill.steps[m.step].text)}</p>}
          <Feedback choice={m.choice} />
        </section>
      ))}

      <div ref={focusRef} tabIndex={-1} className={styles.current} aria-live="polite">
        {!retrying && <p>{inline(step.text)}</p>}
        {step.choices ? (
          <>
            <Heading as="h2" className={styles.ask}>
              {retrying ? 'Try another move' : 'What do you do next?'}
            </Heading>
            <div className={styles.choices}>
              {step.choices
                .filter((c) => !tried.has(c.label))
                .map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    className={`button button--outline button--primary ${styles.choice}`}
                    onClick={() => setMoves([...moves, {step: current, choice: c}])}
                  >
                    {c.label}
                  </button>
                ))}
            </div>
          </>
        ) : (
          <>
            <Heading as="h2" className={styles.ask}>
              Debrief
            </Heading>
            <p>
              Your first move was the strongest one at <strong>{best}</strong> of {firstTry.size}{' '}
              decision points.
            </p>
            <p>Practice the ideas behind this drill:</p>
            <ul>
              {drill.related.map((id) => (
                <li key={id}>
                  <Link to={`/questions#${id}`}>{indexById.get(id)?.title}</Link>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <button type="button" className="button button--primary" onClick={() => setMoves([])}>
                Run it again
              </button>
              <Link className="button button--secondary" to="/drills">
                All drills
              </Link>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default function IncidentDrills(): ReactNode {
  const {hash} = useLocation();
  const drill = DRILLS.find((d) => `#${d.id}` === hash);
  if (drill)
    return (
      <>
        <p>
          <Link to="/drills">← All drills</Link>
        </p>
        <Heading as="h2">{drill.title}</Heading>
        <Run key={drill.id} drill={drill} />
      </>
    );
  return (
    <ul className={styles.list}>
      {DRILLS.map((d) => (
        <li key={d.id}>
          <Link to={`/drills#${d.id}`} className={styles.card}>
            <strong>{d.title}</strong>
            <span>{d.summary}</span>
            <span className={styles.meta}>
              {d.levels.join(' · ')} · {d.topic.join(', ')}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
