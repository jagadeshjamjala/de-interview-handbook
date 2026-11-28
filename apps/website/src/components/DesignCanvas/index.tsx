import {useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react';
import Heading from '@theme/Heading';
import {
  BOX_H,
  BOX_W,
  CANVAS_H,
  CANVAS_W,
  PROVIDER_LABELS,
  PROVIDER_PRESETS,
  REVIEW,
  STAGES,
  STAGE_LABELS,
  addBox,
  clampBox,
  connect,
  empty,
  findings,
  outline,
  removeBox,
  type Box,
  type Provider,
  type Stage,
} from '@site/src/lib/canvas';
import {canvasStore} from '@site/src/lib/store';
import styles from './styles.module.css';

export default function DesignCanvas(): ReactNode {
  const d = canvasStore.use();
  const set = canvasStore.set;
  const [from, setFrom] = useState<string | null>(null); // box waiting for a connection target
  const [provider, setProvider] = useState<Provider>('generic');
  const [custom, setCustom] = useState('');
  const [customStage, setCustomStage] = useState<Stage>('transform');
  const [copied, setCopied] = useState(false);
  const drag = useRef<{id: string; dx: number; dy: number} | null>(null);
  const byId = new Map(d.boxes.map((b) => [b.id, b]));
  const issues = findings(d);

  const move = (b: Box, x: number, y: number) =>
    set({...d, boxes: d.boxes.map((o) => (o.id === b.id ? {...o, ...clampBox(x, y)} : o))});

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, b: Box) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {id: b.id, dx: e.clientX - b.x, dy: e.clientY - b.y};
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>, b: Box) => {
    if (drag.current?.id === b.id)
      move(b, e.clientX - drag.current.dx, e.clientY - drag.current.dy);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, b: Box) => {
    const step = e.shiftKey ? 40 : 10;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (e.target !== e.currentTarget) return; // keys on the box's buttons act normally
    if (delta[e.key]) {
      e.preventDefault();
      move(b, b.x + delta[e.key][0], b.y + delta[e.key][1]);
    } else if (e.key === 'Escape') setFrom(null);
  };
  const link = (to: string) => {
    if (from) set(connect(d, from, to));
    setFrom(null);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(outline(d));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <section aria-label="Add components" className={styles.palette}>
        <label className={styles.provider}>
          <span>Component names</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
            {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        {STAGES.map((s) => (
          <div key={s} className={styles.group}>
            <span className={styles.stageName}>{STAGE_LABELS[s]}</span>
            {PROVIDER_PRESETS[provider][s].map((label) => (
              <button
                key={label}
                type="button"
                className={`button button--sm button--outline button--secondary ${styles.add}`}
                onClick={() => set(addBox(d, s, label))}
              >
                + {label}
              </button>
            ))}
          </div>
        ))}
        <form
          className={styles.custom}
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) set(addBox(d, customStage, custom.trim().slice(0, 40)));
            setCustom('');
          }}
        >
          <label>
            <span>Your own component</span>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={40} />
          </label>
          <label>
            <span>Stage</span>
            <select value={customStage} onChange={(e) => setCustomStage(e.target.value as Stage)}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button button--sm button--primary">
            Add
          </button>
        </form>
      </section>

      <p aria-live="polite" className={styles.status}>
        {from
          ? `Connecting from “${byId.get(from)?.label}”: choose “Link here” on the target box (Esc to cancel).`
          : 'Drag boxes, or focus one and use the arrow keys (Shift for bigger steps). Use “Connect” to draw an arrow.'}
      </p>

      <div className={styles.scroller} tabIndex={0} role="region" aria-label="Pipeline canvas">
        <div className={styles.canvas} style={{width: CANVAS_W, height: CANVAS_H}}>
          {STAGES.map((s, i) => (
            <span key={s} className={styles.lane} style={{left: 20 + i * 200}} aria-hidden="true">
              {STAGE_LABELS[s]}
            </span>
          ))}
          <svg width={CANVAS_W} height={CANVAS_H} className={styles.edges} aria-hidden="true">
            <defs>
              <marker
                id="deih-arrow"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" className={styles.arrowHead} />
              </marker>
            </defs>
            {d.edges.map((e) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b) return null;
              const forward = b.x >= a.x + BOX_W;
              return (
                <line
                  key={`${e.from}-${e.to}`}
                  x1={forward ? a.x + BOX_W : a.x + BOX_W / 2}
                  y1={forward ? a.y + BOX_H / 2 : a.y + BOX_H}
                  x2={forward ? b.x : b.x + BOX_W / 2}
                  y2={forward ? b.y + BOX_H / 2 : b.y}
                  className={styles.edge}
                  markerEnd="url(#deih-arrow)"
                />
              );
            })}
          </svg>
          {d.boxes.map((b) => (
            <div
              key={b.id}
              tabIndex={0}
              role="group"
              aria-label={`${b.label}, ${STAGE_LABELS[b.stage]}`}
              className={`${styles.box} ${styles[b.stage]} ${from === b.id ? styles.selected : ''}`}
              style={{left: b.x, top: b.y, width: BOX_W, height: BOX_H}}
              onPointerDown={(e) => onPointerDown(e, b)}
              onPointerMove={(e) => onPointerMove(e, b)}
              onPointerUp={() => (drag.current = null)}
              onKeyDown={(e) => onKeyDown(e, b)}
            >
              <span className={styles.boxLabel}>{b.label}</span>
              <span className={styles.boxActions}>
                {from && from !== b.id ? (
                  <button type="button" onClick={() => link(b.id)}>
                    Link here
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-pressed={from === b.id}
                    onClick={() => setFrom(from === b.id ? null : b.id)}
                  >
                    {from === b.id ? 'Cancel' : 'Connect'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${b.label}`}
                  onClick={() => {
                    set(removeBox(d, b.id));
                    if (from === b.id) setFrom(null);
                  }}
                >
                  ×
                </button>
              </span>
            </div>
          ))}
          {d.boxes.length === 0 && (
            <p className={styles.emptyHint}>Add a source, then build the pipeline left to right.</p>
          )}
        </div>
      </div>

      <div className={styles.panels}>
        <section>
          <Heading as="h2">Connections</Heading>
          {d.edges.length === 0 ? (
            <p>No arrows yet.</p>
          ) : (
            <ul className={styles.edgeList}>
              {d.edges.map((e) => (
                <li key={`${e.from}-${e.to}`}>
                  {byId.get(e.from)?.label} → {byId.get(e.to)?.label}{' '}
                  <button
                    type="button"
                    className="button button--sm button--link"
                    onClick={() => set({...d, edges: d.edges.filter((x) => x !== e)})}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className="button button--sm button--secondary"
              disabled={!d.edges.length}
              onClick={copy}
            >
              {copied ? 'Copied' : 'Copy design as text'}
            </button>
            <button
              type="button"
              className="button button--sm button--secondary"
              disabled={!d.boxes.length && !d.checks.length}
              onClick={() => {
                set(empty());
                setFrom(null);
              }}
            >
              Clear canvas
            </button>
          </div>
        </section>

        <section>
          <Heading as="h2">Self-review</Heading>
          {d.boxes.length > 0 &&
            (issues.length ? (
              <ul className={styles.issues} aria-label="Diagram checks">
                {issues.map((i) => (
                  <li key={i}>
                    <span aria-hidden="true">⚠ </span>
                    {i}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.ok}>
                <span aria-hidden="true">✓ </span>Every stage is present and connected from source
                to serve.
              </p>
            ))}
          <p>Before you say “done”, can you answer each of these?</p>
          {REVIEW.map((r) => (
            <label key={r.id} className={styles.check}>
              <input
                type="checkbox"
                checked={d.checks.includes(r.id)}
                onChange={(e) =>
                  set({
                    ...d,
                    checks: e.target.checked
                      ? [...d.checks, r.id]
                      : d.checks.filter((c) => c !== r.id),
                  })
                }
              />
              {r.text}
            </label>
          ))}
          <p className={styles.muted}>
            {d.checks.length} / {REVIEW.length} covered. Saved in this browser.
          </p>
        </section>
      </div>
    </div>
  );
}
