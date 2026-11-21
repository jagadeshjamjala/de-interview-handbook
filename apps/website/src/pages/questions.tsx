import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import QuestionBank from '@site/src/components/QuestionBank';

export default function QuestionsPage(): ReactNode {
  return (
    <Layout
      title="Question bank"
      description="Data engineering interview questions, filterable by round, level, topic and difficulty."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">Question bank</Heading>
        <p>Try each question before you open the hints or the solution.</p>
        <QuestionBank />
      </main>
    </Layout>
  );
}
