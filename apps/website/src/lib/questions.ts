// Question types and constants. No data here, so importing this costs nothing.
// Full bank: lib/questionBank.ts. Light index (for links and the planner): lib/questionIndex.ts.

export type Level = 'junior' | 'mid' | 'senior' | 'lead';
export type Round = 'sql' | 'python' | 'modeling' | 'system-design' | 'tools' | 'behavioral';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type Question = {
  id: string;
  title: string;
  round: Round;
  topic: string[];
  levels: Level[];
  difficulty: Difficulty;
  companies: {name: string; source: string}[];
  dataset?: string;
  time_minutes: number;
  prompt: string;
  solution: {sql?: string; python?: string};
  tests?: string;
  guide?: string;
  check?: {order_matters: boolean; float_tolerance?: number};
  rubric?: {point: string; weight: number; topic?: string}[];
  follow_ups?: (string | {q: string; a: string})[];
  dialect_notes?: Record<string, {note: string; source: string}>;
  resources?: {title: string; url: string}[];
  html: {prompt: string; hints: string[]; answer?: string; explanation?: string};
};

export const LEVELS: Level[] = ['junior', 'mid', 'senior', 'lead'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
export const ROUND_LABELS: Record<Round, string> = {
  sql: 'SQL',
  python: 'Python',
  modeling: 'Data modeling',
  'system-design': 'System design',
  tools: 'Tools',
  behavioral: 'Behavioral',
};
