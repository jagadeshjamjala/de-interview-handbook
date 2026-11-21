// Python runner for the Python playground (module Web Worker).
// Runs user code in a fresh namespace, optionally followed by the question's tests, and reports
// pass / fail / error with a traceback trimmed to the user's code. The page can terminate this
// worker to stop an infinite loop. Pyodide is self-hosted next to this file (static/pyodide/).
import {loadPyodide} from './pyodide/pyodide.mjs';

const HARNESS = `
import io, linecache, sys, traceback

def __deih_register(name, src):
    lines = src.splitlines(True)
    linecache.cache[name] = (len(src), None, lines, name)

def __deih_tb(e):
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename in ("solution.py", "tests.py")]
    return "".join(traceback.format_list(frames) + traceback.format_exception_only(type(e), e))

def __deih_run(code, tests):
    out = io.StringIO()
    ns = {"__name__": "__main__"}
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = out
    status, err = ("pass" if tests else "ok"), ""
    try:
        __deih_register("solution.py", code)
        exec(compile(code, "solution.py", "exec"), ns)
        if tests:
            __deih_register("tests.py", tests)
            try:
                exec(compile(tests, "tests.py", "exec"), ns)
            except AssertionError as e:
                status, err = "fail", __deih_tb(e)
    except BaseException as e:
        status, err = "error", __deih_tb(e)
    finally:
        sys.stdout, sys.stderr = old
    return [status, out.getvalue(), err]
`;

const ready = loadPyodide({indexURL: new URL('./pyodide/', import.meta.url).href}).then((py) => {
  py.runPython(HARNESS);
  return py;
});

self.onmessage = async ({data}) => {
  try {
    const py = await ready;
    if (data.type === 'warmup') {
      self.postMessage({id: data.id, status: 'ready'});
      return;
    }
    const run = py.globals.get('__deih_run');
    const result = run(data.code, data.tests ?? '');
    const [status, output, error] = result.toJs();
    result.destroy();
    run.destroy();
    self.postMessage({id: data.id, status, output, error});
  } catch (e) {
    self.postMessage({id: data.id, status: 'error', output: '', error: String(e)});
  }
};
