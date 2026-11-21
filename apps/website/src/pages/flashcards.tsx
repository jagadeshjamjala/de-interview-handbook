import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Flashcards from '@site/src/components/Flashcards';

export default function FlashcardsPage(): ReactNode {
  return (
    <Layout
      title="Flashcards"
      description="Spaced-repetition flashcards from data engineering interview follow-up questions."
    >
      <main className="container margin-vert--lg">
        <Heading as="h1">Flashcards</Heading>
        <p>
          Interviewers love follow-ups. These cards are the follow-up questions from the question
          bank, scheduled with spaced repetition: answer out loud, reveal, then rate yourself. Cards
          you find hard come back sooner. Progress is saved in this browser.
        </p>
        <BrowserOnly fallback={<p>Loading flashcards…</p>}>{() => <Flashcards />}</BrowserOnly>
      </main>
    </Layout>
  );
}
