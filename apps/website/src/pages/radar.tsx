import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import SkillRadar from '@site/src/components/SkillRadar';

export default function RadarPage(): ReactNode {
  return (
    <Layout
      title="Skill radar"
      description="Rate your data engineering interview skills and turn the weak ones into a study plan."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">Skill radar</Heading>
        <p>
          Rate yourself honestly on each skill an interview loop tests. Anything you rate 1 or 2
          becomes a weak topic, and the DE 75 planner schedules those questions first. Ratings are
          saved in this browser.
        </p>
        <div className="client-only">
          <BrowserOnly fallback={<p>Loading the skill radar…</p>}>
            {() => <SkillRadar />}
          </BrowserOnly>
        </div>
      </main>
    </Layout>
  );
}
