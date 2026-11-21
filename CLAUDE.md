# CLAUDE.md

Data Engineering Interview Handbook. A Docusaurus v3 site plus a YAML question bank. **PLAN.md is the source of truth** for scope, phases and decisions. Read it before you change anything.

## Layout
- `apps/website/`: Docusaurus site (TypeScript, React 18). pnpm workspace root is the repo root.
- `questions/**.yaml`: the question bank (single source of truth for pages, planner, playground, mock mode).
- `datasets/`, `scripts/`, `schemas/`, `plans/`: see PLAN.md §3.

## Commands
`pnpm dev` · `pnpm build` · `pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm format:check`.
Python (venv + `requirements.txt`, exact `==` pins): `python datasets/generate.py` (regenerate Parquet + checksums), `python scripts/verify_sql.py` (compare every SQL solution to its golden CSV; `--update-golden` rewrites them, so review the diff).
- Python `duckdb` must match the engine inside `@duckdb/duckdb-wasm` (1.32.0 = DuckDB v1.4.3). Bump both together, plus the vendored Parquet extension in `vendor/duckdb-extensions/`.

## Conventions (must follow)
- **No copied content.** Never copy text from the Tech Interview Handbook or any paid/copyrighted question bank. Write original material.
- **Frontmatter on every doc/blog file:** `levels: [junior|mid|senior|lead, …]` and `topic: [...]`. Both are required.
- **Question YAML** follows PLAN.md §3: `id, title, round, topic, levels, difficulty, companies, time_minutes, prompt, hints, solution`; SQL adds `dataset` and `check`; non-SQL needs `rubric` (`point`, `weight` 1–3, optional `topic`); `dialect_notes.<dialect>` = `{note, source}`; `resources` optional.
- **Company tags** require a public source link.
- **Answers behind `<Spoiler>`**, always.
- **Static assets via `useBaseUrl()`.** Never hardcode `/datasets/...` (the site is served under `/de-interview-handbook/`).
- **DuckDB-WASM and datasets** load only on playground/question pages.
- **Unwritten sections are hidden.** Don't add stub pages. List them on the Roadmap page instead.
- **localStorage** access is always wrapped in try/catch.
- Keep the site static: no backend, no accounts, no cookie-banner analytics.

## Workflow
One phase per session, then stop for review. From Phase 2 on: one branch and one PR per phase.
