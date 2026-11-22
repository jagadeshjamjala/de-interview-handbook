import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';
import DesignCanvas from '@site/src/components/DesignCanvas';

export default function CanvasPage(): ReactNode {
  return (
    <Layout
      title="Pipeline design canvas"
      description="Sketch a data pipeline from source to serve and review it against the questions interviewers ask."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">Pipeline design canvas</Heading>
        <p>
          Practice a <Link to="/docs/rounds/system-design">pipeline design round</Link>: sketch the
          flow from source to serve, then work through the self-review. The canvas is saved in this
          browser.
        </p>
        <div className="client-only">
          <BrowserOnly fallback={<p>Loading the canvas…</p>}>{() => <DesignCanvas />}</BrowserOnly>
        </div>
      </main>
    </Layout>
  );
}
