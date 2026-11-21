# Data Engineering Interview Handbook

A free, open-source **practice** handbook for data engineering interviews, organized into level tracks from Junior to Lead/Staff & EM.

> **Status:** early build. The scaffold is up; the content and the practice tools are coming in phases. See [PLAN.md](PLAN.md).

## What's planned for v1

- **SQL Playground:** solve questions in your browser on realistic seeded tables (DuckDB-WASM), with instant ✅/❌ checking.
- **DE 75 Study Planner:** a week-by-week plan for your level, role and time budget, with calendar export.
- **Mock Interview Mode:** timed sessions, spoiler-free questions, rubric-based self-scoring, and a debrief that feeds your weak topics back into the planner.
- **Level tracks everywhere:** every page and question is tagged Junior / Mid / Senior / Lead.

Questions live as YAML in [`questions/`](questions/). Every SQL answer is checked in CI against a reviewed expected result.

## Run locally

Requires Node 20+ (24 recommended) and pnpm via corepack.

```bash
corepack enable pnpm
pnpm install
pnpm dev          # http://localhost:3000/de-interview-handbook/
```

Other scripts: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This repo has two licenses:

- **Code** (site, components, scripts): [MIT](LICENSE).
- **Content** (`apps/website/docs/`, `apps/website/blog/`, `questions/`): [CC BY-SA 4.0](LICENSE-CONTENT). You may reuse and adapt it, commercially too, as long as you credit this project and share your version under the same license.

## Credit

The handbook's structure is inspired by the [Tech Interview Handbook](https://github.com/yangshun/tech-interview-handbook). All content here is original. No text is copied from it.
