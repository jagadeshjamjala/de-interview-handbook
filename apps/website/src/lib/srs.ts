// Spaced repetition for flashcards: a small SM-2-style scheduler. Pure (no imports at runtime)
// so `node --test` can check it. Dates are local calendar days as 'YYYY-MM-DD'.

export type Rating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = {due: string; interval: number; ease: number; reps: number};
export type Progress = Record<string, CardState>;

export const NEW_PER_DAY = 10;
const MIN_EASE = 1.3;

const pad = (n: number) => String(n).padStart(2, '0');
export const localDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Next state after rating a card on `today`. Unseen cards start with ease 2.5. */
export function schedule(prev: CardState | undefined, rating: Rating, today: string): CardState {
  const ease = prev?.ease ?? 2.5;
  const reps = prev?.reps ?? 0;
  const interval = prev?.interval ?? 0;
  if (rating === 'again') {
    return {due: today, interval: 0, ease: Math.max(MIN_EASE, ease - 0.2), reps: 0};
  }
  let next: number;
  let nextEase = ease;
  if (rating === 'hard') {
    next = Math.max(1, Math.round(interval * 1.2));
    nextEase = Math.max(MIN_EASE, ease - 0.15);
  } else if (reps === 0) {
    next = rating === 'easy' ? 4 : 1;
  } else if (reps === 1) {
    next = rating === 'easy' ? 6 : 3;
  } else {
    next = Math.max(interval + 1, Math.round(interval * ease * (rating === 'easy' ? 1.3 : 1)));
  }
  if (rating === 'easy') nextEase = ease + 0.15;
  return {
    due: addDays(today, next),
    interval: next,
    ease: Math.round(nextEase * 100) / 100,
    reps: reps + 1,
  };
}

/**
 * Today's queue: cards due on or before today (oldest first, then deck order), followed by
 * unseen cards in deck order, at most `newLeft` of them.
 */
export function buildQueue(
  deck: string[],
  progress: Progress,
  today: string,
  newLeft: number,
): string[] {
  const order = new Map(deck.map((id, i) => [id, i]));
  const due = deck
    .filter((id) => progress[id] && progress[id].due <= today)
    .sort(
      (a, b) => progress[a].due.localeCompare(progress[b].due) || order.get(a)! - order.get(b)!,
    );
  const fresh = deck.filter((id) => !progress[id]).slice(0, Math.max(0, newLeft));
  return [...due, ...fresh];
}

/** Earliest future due date among seen cards (for "come back on …"). */
export function nextDue(deck: string[], progress: Progress, today: string): string | null {
  const days = deck.flatMap((id) =>
    progress[id] && progress[id].due > today ? [progress[id].due] : [],
  );
  return days.length ? days.sort()[0] : null;
}
