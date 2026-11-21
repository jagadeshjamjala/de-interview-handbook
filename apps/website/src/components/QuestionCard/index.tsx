import {useState, type ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';
import useBrokenLinks from '@docusaurus/useBrokenLinks';
import Heading from '@theme/Heading';
import Spoiler from '@site/src/components/Spoiler';
import SqlPlayground from '@site/src/components/SqlPlayground';
import CardTimer from '@site/src/components/CardTimer';
import {mockModeStore} from '@site/src/lib/store';
import {ROUND_LABELS, type Question} from '@site/src/lib/questions';
import styles from './styles.module.css';

// html.* is rendered at build time by markdown-it with raw HTML escaped, so it is safe to inject.
function Html({html}: {html: string}): ReactNode {
  return <div className={styles.md} dangerouslySetInnerHTML={{__html: html}} />;
}

export default function QuestionCard({q}: {q: Question}): ReactNode {
  const [trying, setTrying] = useState(false);
  const mock = mockModeStore.use();
  useBrokenLinks().collectAnchor(q.id); // lets the build verify /questions#id links
  return (
    <article className={styles.card} id={q.id}>
      <Heading as="h2" className={styles.title}>
        {q.title}
      </Heading>
      <div className={styles.meta}>
        <span className="badge badge--primary">{ROUND_LABELS[q.round]}</span>
        <span className={`badge ${styles[q.difficulty]}`}>{q.difficulty}</span>
        <span className="badge badge--secondary">{q.levels.join(' · ')}</span>
        <span className={styles.muted}>{q.time_minutes} min</span>
        {q.dataset && <span className={styles.muted}>dataset: {q.dataset}</span>}
      </div>
      <div className={styles.topics}>
        {q.topic.map((t) => (
          <span key={t} className={styles.topic}>
            #{t}
          </span>
        ))}
      </div>

      {mock && <CardTimer minutes={q.time_minutes} />}

      <Html html={q.html.prompt} />

      {q.tests && (
        <details className={styles.examples}>
          <summary>Example tests</summary>
          <CodeBlock language="python">{q.tests.trimEnd()}</CodeBlock>
        </details>
      )}

      {q.guide && (
        <p>
          <Link to={q.guide}>Read the full worked design →</Link>
        </p>
      )}

      {q.round === 'sql' &&
        (trying ? (
          <SqlPlayground question={q} />
        ) : (
          <button
            type="button"
            className="button button--primary button--sm margin-bottom--sm"
            onClick={() => setTrying(true)}
          >
            Try it in the SQL playground
          </button>
        ))}

      {q.html.hints.map((h, i) => (
        <Spoiler key={i} label={`Hint ${i + 1}`} hint>
          <Html html={h} />
        </Spoiler>
      ))}

      <Spoiler>
        {q.solution.sql && <CodeBlock language="sql">{q.solution.sql.trimEnd()}</CodeBlock>}
        {q.solution.python && (
          <CodeBlock language="python">{q.solution.python.trimEnd()}</CodeBlock>
        )}
        {q.html.answer && <Html html={q.html.answer} />}
        {q.html.explanation && <Html html={q.html.explanation} />}

        {q.rubric && (
          <>
            <Heading as="h3">What a strong answer covers</Heading>
            <ul>
              {q.rubric.map((r) => (
                <li key={r.point}>
                  {r.point} <span className={styles.muted}>(weight {r.weight})</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {q.follow_ups && q.follow_ups.length > 0 && (
          <>
            <Heading as="h3">Follow-ups</Heading>
            <ul>
              {q.follow_ups.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </>
        )}

        {q.dialect_notes && (
          <>
            <Heading as="h3">Dialect notes</Heading>
            <ul>
              {Object.entries(q.dialect_notes).map(([dialect, n]) => (
                <li key={dialect}>
                  <strong>{dialect}</strong>: {n.note}{' '}
                  <a href={n.source} target="_blank" rel="noopener noreferrer">
                    docs
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </Spoiler>
    </article>
  );
}
