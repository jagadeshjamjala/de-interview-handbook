import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import MockSession from '@site/src/components/MockSession';

export default function MockPage(): ReactNode {
  return (
    <Layout
      title="Mock interview"
      description="Timed, spoiler-free data engineering mock interviews with rubric self-scoring."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">Mock interview</Heading>
        <p>
          Pick a round, a level and a length. Questions come one at a time against the clock. At the
          end you see the model answers and score yourself on the same rubric an interviewer would
          use.
        </p>
        <BrowserOnly fallback={<p>Loading…</p>}>{() => <MockSession />}</BrowserOnly>
      </main>
    </Layout>
  );
}
