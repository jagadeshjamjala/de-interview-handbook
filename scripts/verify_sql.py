"""Run every SQL question's reference solution against the committed Parquet datasets and
compare it with its reviewed golden result in questions/sql/expected/<id>.csv.

Usage:
  python scripts/verify_sql.py                  # CI: fail on any error or mismatch
  python scripts/verify_sql.py --update-golden  # rewrite golden CSVs (review the diff!)
"""

import csv
import io
import json
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import duckdb
import yaml

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS = ROOT / "questions/sql"
EXPECTED = QUESTIONS / "expected"
DATA = ROOT / "apps/website/static/datasets"


def decimals(tolerance):
    # 0.01 -> 2, 0.0001 -> 4; no tolerance -> 6 so float noise doesn't show up in diffs.
    return 6 if tolerance is None else max(0, len(f"{tolerance:f}".rstrip("0").split(".")[1]))


def cell(v, nd):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (float, Decimal)):
        s = f"{float(v):.{nd}f}"
        return f"{0:.{nd}f}" if float(s) == 0 else s  # no "-0.00"
    if isinstance(v, datetime):
        return v.isoformat(sep=" ")
    if isinstance(v, date):
        return v.isoformat()
    return str(v)


def to_csv(header, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue()


def same(a, b, tol):
    if a == b:
        return True
    try:
        return abs(float(a) - float(b)) <= (tol or 0) + 1e-12
    except ValueError:
        return False


def compare(got, want, check):
    """Return None if equal, else a short reason. Rows are lists of normalized strings."""
    tol = check.get("float_tolerance")
    if got and want and len(got[0]) != len(want[0]):
        return f"column count {len(got[0])}, expected {len(want[0])}"
    if len(got) != len(want):
        return f"row count {len(got)}, expected {len(want)}"
    if not check["order_matters"]:
        got, want = sorted(got), sorted(want)
    for i, (g, w) in enumerate(zip(got, want), start=1):
        if not all(same(x, y, tol) for x, y in zip(g, w)):
            return f"row {i} differs: got {g}, expected {w}"
    return None


def connect(dataset):
    con = duckdb.connect()
    for table in json.loads((DATA / "manifest.json").read_text())[dataset]:
        path = (DATA / dataset / f"{table}.parquet").as_posix()
        con.execute(f"CREATE VIEW {table} AS SELECT * FROM read_parquet('{path}')")
    return con


def main(update):
    failures, seen = [], set()
    for path in sorted(QUESTIONS.glob("*.yaml")):
        q = yaml.safe_load(path.read_text())
        qid, check = q["id"], q["check"]
        seen.add(qid)
        nd = decimals(check.get("float_tolerance"))
        try:
            res = connect(q["dataset"]).execute(q["solution"]["sql"])
            header = [d[0] for d in res.description]
            rows = [[cell(v, nd) for v in row] for row in res.fetchall()]
        except Exception as e:  # noqa: BLE001 - report every broken solution, then fail
            failures.append(f"{qid}: solution errors: {str(e).splitlines()[0]}")
            continue
        if not rows:
            failures.append(f"{qid}: solution returns no rows")
            continue
        golden = EXPECTED / f"{qid}.csv"
        if update:
            EXPECTED.mkdir(exist_ok=True)
            golden.write_text(to_csv(header, rows))
            print(f"  wrote {golden.relative_to(ROOT)} ({len(rows)} rows)")
            continue
        if not golden.exists():
            failures.append(f"{qid}: no golden file; run with --update-golden and review it")
            continue
        want_header, *want = list(csv.reader(golden.open(newline="")))
        if header != want_header:
            failures.append(f"{qid}: columns {header}, expected {want_header}")
        elif reason := compare(rows, want, check):
            failures.append(f"{qid}: {reason}")
        else:
            print(f"  ✓ {qid} ({len(rows)} rows)")

    orphans = [p.name for p in EXPECTED.glob("*.csv") if p.stem not in seen]
    failures += [f"{name}: golden file has no question" for name in orphans]
    if failures:
        print(f"✗ {len(failures)} SQL check(s) failed:\n  " + "\n  ".join(failures))
        sys.exit(1)
    print(f"✓ {len(seen)} SQL solutions {'written' if update else 'match their golden results'}")


if __name__ == "__main__":
    main("--update-golden" in sys.argv[1:])
