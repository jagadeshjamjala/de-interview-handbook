import {useEffect, useRef, useState, type ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useColorMode} from '@docusaurus/theme-common';
import {basicSetup} from 'codemirror';
import {EditorView, keymap} from '@codemirror/view';
import {Compartment, Prec} from '@codemirror/state';
import {python} from '@codemirror/lang-python';
import {darkEditorTheme} from '@site/src/lib/editorTheme';
import type {Question} from '@site/src/lib/questions';
import {starterCode} from '@site/src/lib/pyStarter';
import {runPython, TIMEOUT_SECONDS, warmUp, type RunResult} from './runner';
import styles from './styles.module.css';

export type PythonPlaygroundProps = {
  question: Question;
  /** Called with the editor contents whenever they change (mock sessions record the answer). */
  onCode?: (code: string) => void;
};

const MESSAGES: Record<RunResult['status'], string> = {
  pass: '✅ All tests passed',
  fail: '❌ A test failed',
  error: '❌ Your code raised an error',
  timeout: `❌ Stopped after ${TIMEOUT_SECONDS} s. Is there an infinite loop?`,
  ok: 'Ran without errors',
};

export default function Playground({question, onCode}: PythonPlaygroundProps): ReactNode {
  const base = useBaseUrl('/');
  const {colorMode} = useColorMode();
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const [theme] = useState(() => new Compartment());
  const [initialDoc] = useState(() => starterCode(question.prompt, question.solution.python ?? ''));
  const onCodeRef = useRef(onCode);
  const runRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onCodeRef.current = onCode;
  });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({
      doc: initialDoc,
      parent: host.current,
      extensions: [
        basicSetup,
        python(),
        theme.of([]),
        Prec.highest(keymap.of([{key: 'Mod-Enter', run: () => (runRef.current(), true)}])),
        EditorView.contentAttributes.of({'aria-label': 'Python editor'}),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onCodeRef.current?.(u.state.doc.toString());
        }),
      ],
    });
    view.current = v;
    return () => v.destroy();
  }, [initialDoc, theme]);

  useEffect(() => {
    view.current?.dispatch({
      effects: theme.reconfigure(colorMode === 'dark' ? darkEditorTheme : []),
    });
  }, [colorMode, theme]);

  useEffect(() => {
    let live = true;
    warmUp(base).then(
      () => live && setReady(true),
      (e) => live && setLoadError(`Could not start Python: ${e instanceof Error ? e.message : e}`),
    );
    return () => {
      live = false;
    };
  }, [base]);

  async function exec(withTests: boolean) {
    setBusy(true);
    setResult(null);
    try {
      const code = view.current?.state.doc.toString() ?? '';
      setResult(await runPython(base, code, withTests ? question.tests : undefined));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    runRef.current = () => void exec(Boolean(question.tests));
  });

  return (
    <div className={styles.playground}>
      <div ref={host} className={styles.editor} />
      <div className={styles.actions}>
        <button
          type="button"
          className="button button--secondary"
          disabled={busy || !ready}
          onClick={() => exec(false)}
        >
          Run
        </button>
        {question.tests && (
          <button
            type="button"
            className="button button--primary"
            disabled={busy || !ready}
            onClick={() => exec(true)}
          >
            Run tests
          </button>
        )}
        <span className={styles.muted} aria-live="polite">
          {!ready && !loadError
            ? 'Loading Python (first time takes a few seconds)…'
            : busy
              ? 'Running…'
              : ''}
        </span>
      </div>
      {loadError && (
        <pre role="alert" className={styles.error}>
          {loadError}
        </pre>
      )}
      {result && (
        <>
          <p
            role="status"
            className={result.status === 'pass' || result.status === 'ok' ? styles.ok : styles.bad}
          >
            {MESSAGES[result.status]}
          </p>
          {result.error && <pre className={styles.error}>{result.error}</pre>}
          {result.output && (
            <>
              <p className={styles.muted}>Output</p>
              <pre className={styles.output}>{result.output}</pre>
            </>
          )}
        </>
      )}
    </div>
  );
}
