import {useEffect, useState, type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import de75 from '@site/src/data/de75.json';
import {LEVELS, ROUND_LABELS, type Level, type Question, type Round} from '@site/src/lib/questions';
import {questions} from '@site/src/lib/questionBank';
import {NEW_PER_DAY, buildQueue, localDay, nextDue, schedule, type Rating} from '@site/src/lib/srs';
import {flashcardStore, levelStore, newCardsStore} from '@site/src/lib/store';
import styles from './styles.module.css';

type Card = {id: string; q: Question; front: string; answer?: string};

// Deck in curated DE 75 order (fundamentals first), then any question not in DE 75.
const order = new Map((de75 as {id: string}[]).map((it, i) => [it.id, i]));
const ALL_CARDS: Card[] = [...questions]
  .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
  .flatMap((q) =>
    (q.follow_ups ?? []).map((f, i) => ({
      id: `${q.id}#${i}`,
      q,
      front: typeof f === 'string' ? f : f.q,
      answer: typeof f === 'string' ? undefined : f.a,
    })),
  );
const CARD_BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]));
const ROUNDS = [...new Set(ALL_CARDS.map((c) => c.q.round))] as Round[];
const RATINGS: {rating: Rating; label: string; key: string}[] = [
  {rating: 'again', label: 'Again', key: '1'},
  {rating: 'hard', label: 'Hard', key: '2'},
  {rating: 'good', label: 'Good', key: '3'},
  {rating: 'easy', label: 'Easy', key: '4'},
];

function inDays(due: string, today: string): string {
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86_400_000);
  return days <= 0 ? '<1 day' : days === 1 ? '1 day' : `${days} days`;
}

export default function Flashcards(): ReactNode {
  const savedLevel = levelStore.use();
  const progress = flashcardStore.use();
  const newToday = newCardsStore.use();
  const today = localDay(new Date());
  const [level, setLevel] = useState<Level | ''>(savedLevel ?? '');
  const [rounds, setRounds] = useState<Round[]>(ROUNDS);
  const [extraNew, setExtraNew] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const deck = ALL_CARDS.filter(
    (c) => (!level || c.q.levels.includes(level)) && rounds.includes(c.q.round),
  ).map((c) => c.id);
  const usedNew = newToday.day === today ? newToday.count : 0;
  const queue = buildQueue(deck, progress, today, NEW_PER_DAY + extraNew - usedNew);
  const card = queue.length ? CARD_BY_ID.get(queue[0])! : null;
  const learned = deck.filter((id) => progress[id]).length;
  const dueCount = queue.filter((id) => progress[id]).length;

  const rate = (rating: Rating) => {
    if (!card) return;
    const prev = progress[card.id];
    if (!prev) newCardsStore.set({day: today, count: usedNew + 1});
    flashcardStore.set({...progress, [card.id]: schedule(prev, rating, today)});
    setRevealed(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(el.tagName) || !card) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed) {
        const r = RATINGS.find((x) => x.key === e.key);
        if (r) rate(r.rating);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={styles.flashcards}>
      <form
        className={styles.filters}
        onSubmit={(e) => e.preventDefault()}
        aria-label="Deck filters"
      >
        <label>
          <span>Level</span>
          <select value={level} onChange={(e) => setLevel(e.target.value as Level | '')}>
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Rounds</legend>
          {ROUNDS.map((r) => (
            <label key={r} className={styles.check}>
              <input
                type="checkbox"
                checked={rounds.includes(r)}
                disabled={rounds.length === 1 && rounds.includes(r)}
                onChange={() =>
                  setRounds(rounds.includes(r) ? rounds.filter((x) => x !== r) : [...rounds, r])
                }
              />
              {ROUND_LABELS[r]}
            </label>
          ))}
        </fieldset>
      </form>

      <p className={styles.stats} aria-live="polite">
        <strong>{dueCount}</strong> due · <strong>{queue.length - dueCount}</strong> new today ·{' '}
        <strong>{learned}</strong> / {deck.length} cards seen
      </p>

      {card ? (
        <section className={styles.card} aria-label="Flashcard">
          <p className={styles.from}>
            From <Link to={`/questions#${card.q.id}`}>{card.q.title}</Link> ·{' '}
            {ROUND_LABELS[card.q.round]} · {card.q.difficulty}
            {!progress[card.id] && <span className={styles.newBadge}>new</span>}
          </p>
          <p className={styles.front}>{card.front}</p>

          {!revealed ? (
            <button
              type="button"
              className="button button--primary"
              onClick={() => setRevealed(true)}
            >
              Show answer <span className={styles.key}>(Space)</span>
            </button>
          ) : (
            <>
              <div className={styles.back}>
                {card.answer ? (
                  <p>{card.answer}</p>
                ) : (
                  <>
                    <p>
                      Answer out loud first. There's no written answer for this follow-up yet; check
                      yourself against what a strong answer to the parent question covers:
                    </p>
                    {card.q.rubric && (
                      <ul>
                        {card.q.rubric.map((r) => (
                          <li key={r.point}>{r.point}</li>
                        ))}
                      </ul>
                    )}
                    <p>
                      <Link to={`/questions#${card.q.id}`}>
                        Open the question and its solution →
                      </Link>
                    </p>
                  </>
                )}
              </div>
              <div className={styles.ratings} role="group" aria-label="How well did you answer?">
                {RATINGS.map(({rating, label, key}) => (
                  <button
                    key={rating}
                    type="button"
                    className={`button ${rating === 'again' ? 'button--secondary' : 'button--primary'} ${styles.rate}`}
                    onClick={() => rate(rating)}
                  >
                    {label}
                    <span className={styles.key}>
                      {inDays(schedule(progress[card.id], rating, today).due, today)} · {key}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className={styles.card} aria-label="Flashcard">
          <p className={styles.front}>All caught up for today.</p>
          <p>
            {(() => {
              const next = nextDue(deck, progress, today);
              return next
                ? `Next review: ${next}.`
                : 'Every card in this deck is waiting for its first review.';
            })()}
          </p>
          {deck.some((id) => !progress[id]) && (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setExtraNew(extraNew + 10)}
            >
              Study 10 more new cards
            </button>
          )}
        </section>
      )}

      <p className={styles.reset}>
        {confirmReset ? (
          <>
            Reset all flashcard progress in this browser?{' '}
            <button
              type="button"
              className="button button--sm button--danger"
              onClick={() => {
                flashcardStore.set({});
                newCardsStore.set({day: '', count: 0});
                setConfirmReset(false);
              }}
            >
              Yes, reset
            </button>{' '}
            <button
              type="button"
              className="button button--sm button--link"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button button--sm button--link"
            onClick={() => setConfirmReset(true)}
          >
            Reset progress
          </button>
        )}
      </p>
    </div>
  );
}
