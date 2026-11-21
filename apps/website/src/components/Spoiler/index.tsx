import type {ReactNode} from 'react';
import styles from './styles.module.css';

// Native <details>: keyboard and screen-reader friendly, closed by default.
export default function Spoiler({
  label = 'Show solution',
  children,
}: {
  label?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <details className={styles.spoiler}>
      <summary>{label}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  );
}
