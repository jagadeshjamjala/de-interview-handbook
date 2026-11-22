# Contributing

Thanks for helping. You can contribute in three ways: add a question, fix an answer, or improve a page.

## Ground rules

- **Original work only.** Don't paste text from other interview handbooks, paid question banks, courses or company-internal material.
- **Company tags need a public source.** Only tag a question with a company if you can link a public source for it.
- **Every page and question must be tagged by level** (`junior`, `mid`, `senior`, `lead`) and topic.
- **Dialect notes need a source.** Each one links to official vendor docs.
- Contributions are licensed under the repo's licenses: MIT for code, CC BY-SA 4.0 for content. See [README](README.md#license).

## Local setup

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

Before you open a PR, run:

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build
```

## Pull requests

- One topic per PR.
- CI must be green.
- In the PR description, say what you changed and why.

## Adding a question

Follow the five steps in the [README](README.md#how-to-contribute-a-question). In short: write `questions/<round>/<id>.yaml` against [`schemas/question.schema.json`](schemas/question.schema.json), prove the answer (`scripts/verify_sql.py --update-golden` for SQL and review the CSV; `tests` + `scripts/verify_python.py` for Python), then run `pnpm questions` and `pnpm dev`. Give each follow-up a short model answer (`{q, a}`); it is shown on flashcards and in the solution.

If the question fills a `planned: true` slot in [`plans/de75.yaml`](plans/de75.yaml), replace that entry with your question's `id`.

## Python checks

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/verify_sql.py       # every SQL answer vs its golden result
.venv/bin/python scripts/verify_python.py    # every Python answer vs its tests
.venv/bin/python datasets/generate.py        # regenerate datasets (must not change any bytes)
```
