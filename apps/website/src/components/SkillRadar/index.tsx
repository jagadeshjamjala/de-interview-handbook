import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {questionIndex} from '@site/src/lib/questionIndex';
import {SKILLS, WEAK_AT, radarPoint, weakTopics} from '@site/src/lib/radar';
import {toParams} from '@site/src/lib/plan';
import {radarStore} from '@site/src/lib/store';
import {plannerBase} from '@site/src/components/Planner';
import styles from './styles.module.css';

const MAX = 5;
const SIZE = 360;
const C = SIZE / 2;
const R = 110;
const RATING_LABELS = ['', 'New to it', 'Shaky', 'OK', 'Solid', 'Could teach it'];

export default function SkillRadar(): ReactNode {
  const ratings = radarStore.use();
  const n = SKILLS.length;
  const rate = (id: string, v: number) => radarStore.set({...ratings, [id]: v});
  const weak = weakTopics(ratings);
  const weakSkills = SKILLS.filter((s) => (ratings[s.id] ?? Infinity) <= WEAK_AT);
  const matched = questionIndex.filter((q) => q.topic.some((t) => weak.includes(t))).length;
  const rated = SKILLS.filter((s) => ratings[s.id]).length;
  const pts = SKILLS.map((s, i) => radarPoint(i, n, ratings[s.id] ?? 0, MAX, R, C));
  const ring = (v: number) =>
    SKILLS.map((_, i) => radarPoint(i, n, v, MAX, R, C))
      .map((p) => `${p.x},${p.y}`)
      .join(' ');

  return (
    <div className={styles.radar}>
      <form
        className={styles.form}
        onSubmit={(e) => e.preventDefault()}
        aria-label="Rate your skills"
      >
        {SKILLS.map((s) => (
          <fieldset key={s.id}>
            <legend>{s.label}</legend>
            {[1, 2, 3, 4, 5].map((v) => (
              <label key={v} className={styles.choice} title={RATING_LABELS[v]}>
                <input
                  type="radio"
                  name={s.id}
                  value={v}
                  checked={ratings[s.id] === v}
                  onChange={() => rate(s.id, v)}
                  aria-label={`${v}: ${RATING_LABELS[v]}`}
                />
                {v}
              </label>
            ))}
          </fieldset>
        ))}
        <p className={styles.muted}>
          1 = {RATING_LABELS[1]} · 3 = {RATING_LABELS[3]} · 5 = {RATING_LABELS[5]}
        </p>
      </form>

      <div className={styles.result}>
        <svg
          viewBox={`-60 ${C - R - 40} ${SIZE + 120} ${2 * R + 80}`} // room for axis labels
          className={styles.chart}
          role="img"
          aria-label={`Skill radar: ${SKILLS.map((s) => `${s.label} ${ratings[s.id] ?? 'not rated'}`).join(', ')}`}
        >
          {[1, 2, 3, 4, 5].map((v) => (
            <polygon key={v} points={ring(v)} className={styles.grid} />
          ))}
          {SKILLS.map((s, i) => {
            const end = radarPoint(i, n, MAX, MAX, R, C);
            const lab = radarPoint(i, n, MAX + 0.9, MAX, R, C);
            const anchor = Math.abs(lab.x - C) < 1 ? 'middle' : lab.x > C ? 'start' : 'end';
            return (
              <g key={s.id}>
                <line x1={C} y1={C} x2={end.x} y2={end.y} className={styles.grid} />
                <text
                  x={lab.x}
                  y={lab.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className={styles.label}
                >
                  {s.short}
                </text>
              </g>
            );
          })}
          {rated > 0 && (
            <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className={styles.area} />
          )}
          {SKILLS.map((s, i) =>
            ratings[s.id] ? (
              <circle key={s.id} cx={pts[i].x} cy={pts[i].y} r={5} className={styles.dot}>
                <title>{`${s.label}: ${ratings[s.id]} (${RATING_LABELS[ratings[s.id]]})`}</title>
              </circle>
            ) : null,
          )}
        </svg>

        <div aria-live="polite">
          {rated === 0 ? (
            <p>Rate each skill to draw your radar.</p>
          ) : weakSkills.length === 0 ? (
            <p>
              Nothing rated {WEAK_AT} or lower. Your planner stays balanced across your focus areas.
            </p>
          ) : (
            <p>
              Weak spots: <strong>{weakSkills.map((s) => s.label).join(', ')}</strong>. The planner
              will put the {matched} questions on these topics first.
            </p>
          )}
          <div className={styles.actions}>
            <Link
              className="button button--primary"
              to={`/planner?${toParams({...plannerBase(), weak})}`}
            >
              Build my DE 75 plan
            </Link>
            {rated > 0 && (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => radarStore.set({})}
              >
                Reset ratings
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
