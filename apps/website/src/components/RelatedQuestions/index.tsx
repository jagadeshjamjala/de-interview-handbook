import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {
  questions,
  questionsById,
  ROUND_LABELS,
  type Question,
  type Round,
} from '@site/src/lib/questions';
import styles from './styles.module.css';

type Props = {ids?: string[]; round?: Round; topic?: string};

// Links into the question bank. `ids` keeps the given order; scripts/check-content.ts fails CI on unknown ids.
export default function RelatedQuestions({ids, round, topic}: Props): ReactNode {
  const list: Question[] = ids
    ? ids.flatMap((id) => questionsById.get(id) ?? [])
    : questions.filter((q) => (!round || q.round === round) && (!topic || q.topic.includes(topic)));
  return (
    <ul className={styles.list}>
      {list.map((q) => (
        <li key={q.id}>
          <Link to={`/questions#${q.id}`}>{q.title}</Link>{' '}
          <span className={styles.meta}>
            {ROUND_LABELS[q.round]} · {q.difficulty} · {q.levels.join(', ')}
          </span>
        </li>
      ))}
    </ul>
  );
}
