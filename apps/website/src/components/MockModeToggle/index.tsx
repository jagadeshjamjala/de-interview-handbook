import type {ReactNode} from 'react';
import clsx from 'clsx';
import {mockModeStore} from '@site/src/lib/store';
import styles from './styles.module.css';

// Navbar item (type: custom-mockToggle). On = every solution stays locked, hints hidden, timers shown.
export default function MockModeToggle({mobile}: {mobile?: boolean}): ReactNode {
  const on = mockModeStore.use();
  return (
    <div className={mobile ? 'menu__list-item' : 'navbar__item'}>
      <button
        type="button"
        aria-pressed={on}
        className={clsx(
          'button button--sm',
          on ? 'button--primary' : 'button--secondary',
          styles.toggle,
        )}
        onClick={() => mockModeStore.set(!on)}
        title="Mock mode hides every solution and hint, and adds a timer to each question"
      >
        Mock mode: {on ? 'on' : 'off'}
      </button>
    </div>
  );
}
