import type {ReactNode} from 'react';
import clsx from 'clsx';
import {levelStore} from '@site/src/lib/store';
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
  const level = levelStore.use();
  const rows = (Object.keys(LABELS) as (keyof Props)[]).filter((k) => props[k]);
  return (
    <aside className={styles.box} aria-label="What's expected at your level">
      <p className={styles.heading}>What's expected at your level</p>
      <dl className={styles.list}>
        {rows.map((k) => (
          <div key={k} className={clsx(styles.row, k === level && styles.mine)}>
            <dt>
              {LABELS[k]}
              {k === level && <span className={styles.you}> · your level</span>}
            </dt>
            <dd>{props[k]}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
