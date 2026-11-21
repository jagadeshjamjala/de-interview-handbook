// Talks to static/py-worker.mjs. One worker per page; a run that exceeds the time limit
// terminates the worker (the only way to stop an infinite loop) and a fresh one starts next time.

export type RunResult = {
  status: 'ok' | 'pass' | 'fail' | 'error' | 'timeout';
  output: string;
  error: string;
};

const TIMEOUT_MS = 10_000;
let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 0;

function start(baseUrl: string): Promise<void> {
  if (!worker) {
    worker = new Worker(new URL(`${baseUrl}py-worker.mjs`, window.location.href), {type: 'module'});
    ready = call({type: 'warmup'}, 120_000).then((r) => {
      if (r.status === 'error' || r.status === 'timeout') {
        ready = null;
        throw new Error(r.error || 'Python took too long to load');
      }
    });
  }
  return ready!;
}

function call(msg: Record<string, unknown>, timeout: number): Promise<RunResult> {
  const w = worker!;
  const id = ++nextId;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.terminate();
      if (worker === w) worker = null;
      resolve({status: 'timeout', output: '', error: ''});
    }, timeout);
    const done = (r: RunResult) => {
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      resolve(r);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data.id === id) done(e.data as RunResult);
    };
    // A worker that fails to load (network, MIME type, unsupported browser) reports here.
    const onError = (e: ErrorEvent) => {
      e.preventDefault();
      w.terminate();
      if (worker === w) worker = null;
      done({
        status: 'error',
        output: '',
        error: `Python failed to load: ${e.message || 'worker error'}`,
      });
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({...msg, id});
  });
}

export async function warmUp(baseUrl: string): Promise<void> {
  await start(baseUrl);
}

export async function runPython(baseUrl: string, code: string, tests?: string): Promise<RunResult> {
  await start(baseUrl);
  return call({type: 'run', code, tests: tests ?? ''}, TIMEOUT_MS);
}

export const TIMEOUT_SECONDS = TIMEOUT_MS / 1000;
