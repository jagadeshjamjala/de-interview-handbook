import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Planner from '@site/src/components/Planner';

export default function PlannerPage(): ReactNode {
  return (
    <Layout
      title="DE 75 study planner"
      description="A week-by-week data engineering interview study plan for your level, role and time."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">DE 75 study planner</Heading>
        <p>
          Set your level, role and time, and get a week-by-week plan from 75 curated questions.
          Progress is saved in this browser. The link reproduces the same plan anywhere.
        </p>
        <BrowserOnly fallback={<p>Loading planner…</p>}>{() => <Planner />}</BrowserOnly>
      </main>
    </Layout>
  );
}
