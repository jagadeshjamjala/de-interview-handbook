# CLAUDE.md

Data Engineering Interview Handbook. A Docusaurus v3 site plus a YAML question bank. **PLAN.md is the source of truth** for scope, phases and decisions. Read it before you change anything.

## Layout
- `apps/website/`: Docusaurus site (TypeScript, React 18). pnpm workspace root is the repo root.
- `questions/**.yaml`: the question bank (single source of truth for pages, planner, playground, mock mode).
- `datasets/`, `scripts/`, `schemas/`, `plans/`: see PLAN.md §3.

## Commands
`pnpm dev` · `pnpm build` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm format:check`.
Python (venv + `requirements.txt`, exact `==` pins): `python datasets/generate.py` (regenerate Parquet + checksums), `python scripts/verify_sql.py` (compare every SQL solution to its golden CSV; `--update-golden` rewrites them, so review the diff), `python scripts/verify_python.py` (run each Python question's `tests` against its `solution.python`).
- Python `duckdb` must match the engine inside `@duckdb/duckdb-wasm` (1.32.0 = DuckDB v1.4.3). Bump both together, plus the vendored Parquet extension in `vendor/duckdb-extensions/`.

## Conventions (must follow)
- **No copied content.** Never copy text from the Tech Interview Handbook or any paid/copyrighted question bank. Write original material.
- **Frontmatter on every doc/blog file:** `levels: [junior|mid|senior|lead, …]` and `topic: [...]`. Both are required.
- **Question YAML** follows PLAN.md §3: `id, title, round, topic, levels, difficulty, companies, time_minutes, prompt, hints, solution`; SQL adds `dataset` and `check`; non-SQL needs `rubric` (`point`, `weight` 1–3, optional `topic`); `dialect_notes.<dialect>` = `{note, source}`; `resources` optional.
- **Company tags** require a public source link.
- **Answers behind `<Spoiler>`**, always.
- **MDX components** are global (no imports): `<LevelExpectations junior=… mid=… senior=… lead=… />` opens every page; `<RelatedQuestions ids={[…]} | round=… | topic=… />`; `<QuestionEmbed id=… />`; `<Spoiler>`. `pnpm questions` fails on unknown question ids or missing frontmatter.
- **Static assets via `useBaseUrl()`.** Never hardcode `/datasets/...` (the site is served under `/de-interview-handbook/`).
- **DuckDB-WASM and datasets** load only on playground/question pages.
- **Unwritten sections are hidden.** Don't add stub pages. List them on the Roadmap page instead.
- **localStorage** access is always wrapped in try/catch.
- Keep the site static: no backend, no accounts, no cookie-banner analytics.
- **DE 75** (`plans/de75.yaml`): the order is the study order. Live items are just `id` (+ optional `roles`); unwritten ones are `planned: true` with `round` and `title`. `pnpm questions` fails on unknown ids, duplicates, or per-round counts that don't match the targets. When you add a planned question, replace its planned entry with the real id.
- **Follow-ups** are `{q, a}` with a short model answer (shown on flashcards and in the solution). Plain strings still validate but show no answer.
- **Browser state** goes through `src/lib/store.ts` (localStorage with try/catch, hydration-safe). Planner settings live in the URL so links reproduce plans; progress and level are per browser.

## Workflow
One phase per session, then stop for review. From Phase 2 on: one branch and one PR per phase.
