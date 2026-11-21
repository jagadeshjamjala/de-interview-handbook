import type {ReactNode} from 'react';
import QuestionCard from '@site/src/components/QuestionCard';
import {questionsById} from '@site/src/lib/questionBank';

// Renders one bank question inline (worked designs embed their own question).
export default function QuestionEmbed({id}: {id: string}): ReactNode {
  const q = questionsById.get(id);
  if (!q) throw new Error(`QuestionEmbed: unknown question id "${id}"`);
  return <QuestionCard q={q} showGuide={false} />;
}
