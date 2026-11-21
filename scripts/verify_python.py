"""Run every Python question's tests against its reference solution.

Each question has `solution.python` and `tests` (plain asserts). They run together in a fresh
namespace, so a wrong solution or a broken test fails CI.

Usage: python scripts/verify_python.py
"""

import sys
import traceback
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def main():
    failures, count = [], 0
    for path in sorted((ROOT / "questions/python").glob("*.yaml")):
        q = yaml.safe_load(path.read_text())
        count += 1
        ns = {"__name__": f"question_{q['id'].replace('-', '_')}"}
        try:
            exec(compile(q["solution"]["python"], f"{q['id']}:solution", "exec"), ns)
            exec(compile(q["tests"], f"{q['id']}:tests", "exec"), ns)
            print(f"  ✓ {q['id']}")
        except Exception:  # noqa: BLE001 - report every failing question, then fail
            last = traceback.format_exc().strip().splitlines()
            failures.append(f"{q['id']}: {' | '.join(last[-3:])}")
    if failures:
        print(f"✗ {len(failures)} Python question(s) failed:\n  " + "\n  ".join(failures))
        sys.exit(1)
    print(f"✓ {count} Python solutions pass their tests")


if __name__ == "__main__":
    main()
