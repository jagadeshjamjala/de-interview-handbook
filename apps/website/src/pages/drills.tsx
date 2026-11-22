import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import IncidentDrills from '@site/src/components/IncidentDrill';

export default function DrillsPage(): ReactNode {
  return (
    <Layout
      title="Incident drills"
      description="Branching data engineering incident scenarios: decide what to check next and get feedback on each move."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">Incident drills</Heading>
        <p>
          Senior interviews often ask &ldquo;walk me through how you&rsquo;d debug this.&rdquo; Each
          drill is a realistic incident: pick your next move, see why it helps or hurts, and keep
          going until it&rsquo;s resolved. Say your reasoning out loud before you click.
        </p>
        <div className="client-only">
          <BrowserOnly fallback={<p>Loading drills…</p>}>{() => <IncidentDrills />}</BrowserOnly>
        </div>
      </main>
    </Layout>
  );
}
