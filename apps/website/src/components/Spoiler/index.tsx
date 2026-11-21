import type {ReactNode} from 'react';
import {mockModeStore} from '@site/src/lib/store';
import styles from './styles.module.css';

// Native <details>: keyboard and screen-reader friendly, closed by default.
// In mock mode solutions stay locked and hints (`hint`) are not shown at all.
export default function Spoiler({
  label = 'Show solution',
  hint = false,
  children,
}: {
  label?: string;
  hint?: boolean;
  children: ReactNode;
}): ReactNode {
  const mock = mockModeStore.use();
  if (mock && hint) return null;
  if (mock) {
    return (
      <p className={styles.locked}>
        🔒 {label} is locked in mock mode. Turn mock mode off in the navbar to see it.
      </p>
    );
  }
  return (
    <details className={styles.spoiler}>
      <summary>{label}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
