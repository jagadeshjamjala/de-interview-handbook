// The full question bank (prompts, solutions, rubrics). Import only on pages that render
// questions: it's large and would otherwise ship to every page.
import data from '@site/src/data/questions.json';
import type {Question} from './questions';

export const questions = data as unknown as Question[];
export const questionsById = new Map(questions.map((q) => [q.id, q]));
