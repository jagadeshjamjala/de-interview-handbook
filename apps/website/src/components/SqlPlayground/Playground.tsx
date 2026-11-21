import {useEffect, useRef, useState, type ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useColorMode} from '@docusaurus/theme-common';
import {basicSetup} from 'codemirror';
import {EditorView, keymap} from '@codemirror/view';
import {Compartment, Prec} from '@codemirror/state';
import {sql} from '@codemirror/lang-sql';
import {oneDark} from '@codemirror/theme-one-dark';
import type {Question} from '@site/src/lib/questions';
import {compareResults, type Verdict} from './compare';
import {datasets, loadDataset, runQuery, type QueryResult} from './duckdb';
import styles from './styles.module.css';

const MAX_ROWS = 200;

export type PlaygroundProps = {
  question?: Question;
  dataset?: string;
  /** Called after every "Check my answer" (mock sessions record the result). */
  onVerdict?: (v: Verdict, sql: string) => void;
};

function schemaFor(ds: string): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(datasets[ds]).map(([t, m]) => [t, m.columns.map((c) => c.name)]),
  );
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function Playground({question, dataset, onVerdict}: PlaygroundProps): ReactNode {
  const names = Object.keys(datasets);
  const [ds, setDs] = useState(question?.dataset ?? dataset ?? names[0]);
  const [initialDoc] = useState(() =>
    question
      ? '-- Write your query here. Run: Ctrl/⌘ + Enter\n'
      : `SELECT * FROM ${Object.keys(datasets[ds])[0]} LIMIT 10;\n`,
  );
  const base = useBaseUrl('/');
  const {colorMode} = useColorMode();

  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [lang] = useState(() => new Compartment());
  const [theme] = useState(() => new Compartment());
  const runRef = useRef<() => void>(() => {});

  const [ready, setReady] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      doc: initialDoc,
      parent: host.current,
      extensions: [
        basicSetup,
        lang.of([]),
        theme.of([]),
        Prec.highest(keymap.of([{key: 'Mod-Enter', run: () => (runRef.current(), true)}])),
        EditorView.contentAttributes.of({'aria-label': 'SQL editor'}),
      ],
    });
    view.current = v;
    return () => v.destroy();
  }, [initialDoc, lang, theme]);

  useEffect(() => {
    view.current?.dispatch({
      effects: lang.reconfigure(sql({schema: schemaFor(ds), upperCaseKeywords: true})),
    });
  }, [ds, lang]);

  useEffect(() => {
    view.current?.dispatch({effects: theme.reconfigure(colorMode === 'dark' ? oneDark : [])});
  }, [colorMode, theme]);

  useEffect(() => {
    let live = true;
    loadDataset(base, ds).then(
      () => live && setReady((r) => [...r, ds]),
      (e) => live && setError(`Could not start the SQL engine: ${message(e)}`),
    );
    return () => {
      live = false;
    };
  }, [base, ds]);

  async function exec(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setVerdict(null);
    try {
      await loadDataset(base, ds);
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  const editorSql = () => view.current?.state.doc.toString() ?? '';
  const run = () => exec(async () => setResult(await runQuery(base, editorSql())));
  const preview = (table: string) =>
    exec(async () => setResult(await runQuery(base, `SELECT * FROM ${table} LIMIT 10`)));
  const check = () =>
    exec(async () => {
      if (!question?.solution.sql || !question.check) return;
      const got = await runQuery(base, editorSql());
      setResult(got);
      // shortcut: reference runs in the same DB, so a user `DROP VIEW` breaks it until reload.
      const want = await runQuery(base, question.solution.sql);
      const v = compareResults(
        got.columns.length,
        got.rows,
        want.columns.length,
        want.rows,
        question.check,
      );
      setVerdict(v);
      onVerdict?.(v, editorSql());
    });

  useEffect(() => {
    runRef.current = run;
  });

  const isReady = ready.includes(ds);

  return (
    <div className={styles.playground}>
      <aside className={styles.schema} aria-label="Tables">
        {!question && (
          <label className={styles.dataset}>
            <span>Dataset</span>
            <select value={ds} onChange={(e) => setDs(e.target.value)}>
              {names.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        {Object.entries(datasets[ds]).map(([table, meta]) => (
          <details key={table} className={styles.table}>
            <summary>
              <code>{table}</code>{' '}
              <span className={styles.muted}>{meta.rows.toLocaleString('en-US')} rows</span>
            </summary>
            <ul>
              {meta.columns.map((c) => (
                <li key={c.name}>
                  <code>{c.name}</code> <span className={styles.muted}>{c.type}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="button button--sm button--secondary"
              disabled={busy || !isReady}
              onClick={() => preview(table)}
            >
              Preview 10 rows
            </button>
          </details>
        ))}
      </aside>

      <div className={styles.main}>
        <div ref={host} className={styles.editor} />
        <div className={styles.actions}>
          <button
            type="button"
            className="button button--primary"
            disabled={busy || !isReady}
            onClick={run}
          >
            Run
          </button>
          {question?.check && (
            <button
              type="button"
              className="button button--secondary"
              disabled={busy || !isReady}
              onClick={check}
            >
              Check my answer
            </button>
          )}
          <span className={styles.muted} aria-live="polite">
            {!isReady && !error ? 'Loading SQL engine and data…' : busy ? 'Running…' : ''}
          </span>
        </div>

        {verdict && (
          <p role="status" className={verdict.ok ? styles.ok : styles.bad}>
            {verdict.ok ? '✅ Correct' : `❌ ${verdict.message}`}
          </p>
        )}
        {error && (
          <pre role="alert" className={styles.error}>
            {error}
          </pre>
        )}
        {result && (
          <>
            <p className={styles.muted}>
              {result.rows.length.toLocaleString('en-US')} rows · {Math.round(result.ms)} ms
              {result.rows.length > MAX_ROWS && ` · showing the first ${MAX_ROWS}`}
            </p>
            <div className={styles.grid}>
              <table>
                <thead>
                  <tr>
                    {result.columns.map((c, i) => (
                      <th key={i}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, MAX_ROWS).map((row, r) => (
                    <tr key={r}>
                      {row.map((v, c) => (
                        <td key={c}>
                          {v === null ? <em className={styles.muted}>NULL</em> : String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
