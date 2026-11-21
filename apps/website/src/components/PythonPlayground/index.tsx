import {lazy, Suspense, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import type {PythonPlaygroundProps} from './Playground';

// Pyodide + CodeMirror live in a separate chunk, fetched only when a playground renders.
const Playground = lazy(() => import('./Playground'));

const loading = <p>Loading Python playground…</p>;

export default function PythonPlayground(props: PythonPlaygroundProps): ReactNode {
  return (
    <BrowserOnly fallback={loading}>
      {() => (
        <Suspense fallback={loading}>
          <Playground {...props} />
        </Suspense>
      )}
    </BrowserOnly>
  );
}
