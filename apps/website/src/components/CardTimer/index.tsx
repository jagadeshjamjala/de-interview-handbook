import {useEffect, useState, type ReactNode} from 'react';

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Countdown shown on question cards in mock mode.
export default function CardTimer({minutes}: {minutes: number}): ReactNode {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (endsAt === null) {
    return (
      <button
        type="button"
        className="button button--sm button--outline button--primary margin-bottom--sm"
        onClick={() => {
          setNow(Date.now());
          setEndsAt(Date.now() + minutes * 60_000);
        }}
      >
        ⏱ Start {minutes}-minute timer
      </button>
    );
  }
  const left = (endsAt - now) / 1000;
  return (
    <p role="timer" aria-live="off" className="margin-bottom--sm">
      ⏱ {left > 0 ? `${formatClock(left)} left` : "Time's up"}{' '}
      <button
        type="button"
        className="button button--sm button--link"
        onClick={() => setEndsAt(null)}
      >
        Reset
      </button>
    </p>
  );
}
