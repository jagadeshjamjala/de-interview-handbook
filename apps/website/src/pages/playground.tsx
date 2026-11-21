import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import SqlPlayground from '@site/src/components/SqlPlayground';

export default function PlaygroundPage(): ReactNode {
  return (
    <Layout
      title="SQL playground"
      description="Run SQL in your browser on realistic data engineering datasets (DuckDB-WASM)."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">SQL playground</Heading>
        <p>
          Pick a dataset and write any query. Everything runs in your browser with DuckDB, so
          nothing is sent to a server.
        </p>
        <SqlPlayground />
      </main>
    </Layout>
  );
}
