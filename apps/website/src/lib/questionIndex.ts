// Light question index (no prompts or solutions), safe to use in globally loaded components.
import data from '@site/src/data/questions-index.json';
import type {Question} from './questions';

export type QuestionSummary = Pick<
  Question,
  'id' | 'title' | 'round' | 'topic' | 'levels' | 'difficulty' | 'time_minutes'
>;
export const questionIndex = data as QuestionSummary[];
export const indexById = new Map(questionIndex.map((q) => [q.id, q]));
