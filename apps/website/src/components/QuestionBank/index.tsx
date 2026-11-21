import {useState, type ReactNode} from 'react';
import QuestionCard from '@site/src/components/QuestionCard';
import {DIFFICULTIES, LEVELS, ROUND_LABELS, type Level, type Round} from '@site/src/lib/questions';
import {questions} from '@site/src/lib/questionBank';
import {levelStore} from '@site/src/lib/store';
import styles from './styles.module.css';

const ALL = '';

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}): ReactNode {
  return (
    <label className={styles.filter}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>All</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function QuestionBank(): ReactNode {
  const [round, setRound] = useState(ALL);
  // Follows the navbar level until the reader picks a level here.
  const [levelOverride, setLevel] = useState<string | null>(null);
  const savedLevel = levelStore.use();
  const level = levelOverride ?? savedLevel ?? ALL;
  const [topic, setTopic] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);

  const rounds = [...new Set(questions.map((q) => q.round))];
  const topics = [...new Set(questions.flatMap((q) => q.topic))].sort();

  const shown = questions.filter(
    (q) =>
      (!round || q.round === round) &&
      (!level || q.levels.includes(level as Level)) &&
      (!topic || q.topic.includes(topic)) &&
      (!difficulty || q.difficulty === difficulty),
  );

  return (
    <>
      <div className={styles.filters}>
        <Filter
          label="Round"
          value={round}
          onChange={setRound}
          options={rounds.map((r) => [r, ROUND_LABELS[r as Round]])}
        />
        <Filter
          label="Level"
          value={level}
          onChange={setLevel}
          options={LEVELS.map((l) => [l, l])}
        />
        <Filter
          label="Topic"
          value={topic}
          onChange={setTopic}
          options={topics.map((t) => [t, t])}
        />
        <Filter
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={DIFFICULTIES.map((d) => [d, d])}
        />
      </div>
      <p className={styles.count} aria-live="polite">
        Showing {shown.length} of {questions.length} questions
      </p>
      {shown.length === 0 ? (
        <p>No questions match these filters.</p>
      ) : (
        shown.map((q) => <QuestionCard key={q.id} q={q} />)
      )}
    </>
  );
}
