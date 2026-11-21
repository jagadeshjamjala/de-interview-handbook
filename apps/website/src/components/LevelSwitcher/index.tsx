import type {ReactNode} from 'react';
import clsx from 'clsx';
import {LEVELS, type Level} from '@site/src/lib/questions';
import {levelStore} from '@site/src/lib/store';
import styles from './styles.module.css';

const LABELS: Record<Level, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead / Staff / EM',
};

// Navbar item (type: custom-levelSwitcher). Choice is saved in localStorage.
export default function LevelSwitcher({mobile}: {mobile?: boolean}): ReactNode {
  const level = levelStore.use();
  return (
    <label className={clsx(styles.switcher, mobile ? 'menu__list-item' : 'navbar__item')}>
      <span className={styles.label}>Level</span>
      <select
        aria-label="Your level"
        value={level ?? ''}
        onChange={(e) => levelStore.set((e.target.value || null) as Level | null)}
      >
        <option value="">All levels</option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
