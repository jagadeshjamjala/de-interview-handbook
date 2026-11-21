import type {ReactNode} from 'react';
import styles from './styles.module.css';

type Props = {junior?: ReactNode; mid?: ReactNode; senior?: ReactNode; lead?: ReactNode};

const LABELS = {
  junior: 'Junior (0–2y)',
  mid: 'Mid (2–5y)',
  senior: 'Senior (5–8y)',
  lead: 'Lead / Staff / EM (8y+)',
} as const;

// "What's expected at your level" box that opens each page (PLAN.md §4.4).
export default function LevelExpectations(props: Props): ReactNode {
  const rows = (Object.keys(LABELS) as (keyof Props)[]).filter((k) => props[k]);
  return (
    <aside className={styles.box} aria-label="What's expected at your level">
      <p className={styles.heading}>What's expected at your level</p>
      <dl className={styles.list}>
        {rows.map((k) => (
          <div key={k} className={styles.row}>
            <dt>{LABELS[k]}</dt>
            <dd>{props[k]}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
