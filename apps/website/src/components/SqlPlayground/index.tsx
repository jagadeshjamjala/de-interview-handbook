import {lazy, Suspense, type ReactNode} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import type {PlaygroundProps} from './Playground';

// DuckDB-WASM + CodeMirror live in a separate chunk, fetched only when a playground renders.
const Playground = lazy(() => import('./Playground'));

const loading = <p>Loading SQL playground…</p>;

export default function SqlPlayground(props: PlaygroundProps): ReactNode {
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
