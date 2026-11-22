# Data Engineering Interview Handbook — Build Plan

> Execute one phase per session, then stop for review. Each phase ends with a "Done when" check.

## 0. Decisions locked in

| Decision | Choice |
|---|---|
| Audience | All levels, with **level tracks**: Junior (0–2y), Mid (2–5y), Senior (5–8y), Lead/Staff & EM (8y+) |
| Role types | **Data Engineer (generalist, default) / Analytics Eng / Platform DE / Streaming DE / ML Data Eng** — used everywhere (Start here, planner). Lead is a level, not a role |
| Stack | **Docusaurus v3** (MDX, TypeScript, React 18) |
| v1 differentiators | **SQL Playground** (DuckDB-WASM), **DE 75 Study Planner**, **Mock Interview Mode** |
| License | **MIT for code**, **CC BY-SA 4.0 for content** (`docs/`, `blog/`, `questions/`) in `LICENSE-CONTENT`. README explains both |
| Brand | Standalone, no newsletter CTA. Same **setup** as DataEngTube (public repo, GitHub Actions, GitHub Pages). Visual identity is this project's own |
| Inspiration | Tech Interview Handbook (TIH) for structure only. **No copied text.** Credit TIH in README |
| Content authoring | Claude Code drafts everything; Jagadesh reviews each phase |
| Tooling | pnpm via **corepack**, pinned in root `package.json` `"packageManager": "pnpm@<version>"`. Python: plain **venv + `requirements.txt` with exact `==` pins**; CI uses `actions/setup-python` with pip cache |

Working name: **Data Engineering Interview Handbook** · repo: `jagadeshjamjala/de-interview-handbook` · hosting: **GitHub Pages** · search: **local search plugin** · custom domain: later.

### Workflow
- One phase per session; stop for review after each.
- Everything stays local until Phase 1 passes review. Then create the public repo `jagadeshjamjala/de-interview-handbook` and push.
- From Phase 2 on: one branch + one PR per phase, merged after review.
- GitHub Pages deploy is turned on only in Phase 6.

---

## 1. How it differs from Tech Interview Handbook

TIH is a reading handbook for SWE coding interviews. This one is a **practice handbook** for DE interviews. The core differences:

1. **Questions are data, not prose.** Every question lives in YAML (`/questions/**.yaml`) with level, topic, company tags, difficulty, hints, solution, rubric, and (for SQL) a runnable check. Pages, the planner, the playground, and mock mode all read from that one source.
2. **You run the answer.** SQL questions run in the browser on real seeded tables and are auto-checked.
3. **Spoiler-free by default.** Solutions are hidden until you've tried. A site-wide "Mock mode" toggle hides all answers and adds a timer.
4. **Level tracks everywhere.** Every page and question is tagged by level. A level switcher in the navbar filters the sidebar and highlights "what matters at your level".
5. **DE-specific rounds** TIH doesn't cover: SQL, data modeling, pipeline system design, tool deep dives (Spark/Kafka/Airflow/dbt/warehouses), data quality, on-call/incident drills.
6. **CI-verified answers.** Every SQL answer is checked against a reviewed expected result. A wrong result fails CI.

---

## 2. Information architecture

Sections not written in v1 are **hidden** from the sidebar (no stub pages). One **Roadmap** page lists what's coming, with a "Contribute" link.

```
Start here
  ├─ How DE interviews work (loop types by company size)
  ├─ Which DE are you? (Data Engineer (generalist, default) / Analytics Eng / Platform DE / Streaming DE / ML Data Eng)
  ├─ Pick your level track
  ├─ The DE 75 planner  →  /planner
  └─ Roadmap (what's coming + contribute)

Step 1 — Resume & profile
  ├─ DE resume: quantifying pipelines (volume, latency, cost, SLA)
  ├─ Telling a migration story (legacy → cloud)
  └─ Portfolio projects that actually get callbacks

Step 2 — The rounds
  ├─ SQL round            (patterns + playground questions)
  ├─ Python / coding round (DE-flavored: parsing, generators, APIs, files; light DSA) — text-only in v1
  ├─ Data modeling        (grain, Kimball, SCD 1/2/3/6, Data Vault, OBT, "model X")
  ├─ Pipeline system design (framework + worked designs)
  ├─ Tool deep dives      (Spark, Kafka, Airflow, dbt, Snowflake, BigQuery, Databricks, Iceberg/Delta)   [hidden in v1]
  ├─ Data quality & observability                                                                      [hidden in v1]
  ├─ Incident drills      ("the dashboard is wrong", "the job is 3h late")                              [live: /drills page]
  └─ Behavioral           (DE story bank: incidents, migrations, stakeholder disputes)

Step 3 — Lead / Staff / EM track                                                                       [hidden in v1]
  ├─ Platform strategy, build vs buy, cost (FinOps)
  ├─ Team design & hiring
  └─ Leadership behavioral

Step 4 — Offer                          [hidden in v1 — no compensation until there are real, cited sources]
  ├─ DE levels across companies
  ├─ DE compensation explained
  └─ Negotiation

Practice
  ├─ SQL Playground        → /playground
  ├─ Question bank         → /questions  (filter by level/topic/difficulty)
  ├─ Mock interview        → /mock
  └─ Cheatsheets           (SQL window functions, SCD types, dialect gotchas in v1; Spark tuning, Kafka guarantees later)

Blog (Docusaurus blog plugin)
```

### SQL pattern list (seed for content)
Top-N per group · dedup with ROW_NUMBER · running totals & moving averages · gaps & islands · sessionization · retention/cohorts · funnel conversion · pivot/unpivot · SCD Type 2 merge · median & percentiles · self-joins (manager chains) · recursive CTEs · anti-joins (NOT EXISTS vs LEFT JOIN) · date spine / fill missing days · year-over-year · NULL traps · fan-out join bugs.

### Pipeline system design — worked examples
A **worked design** is a long MDX walkthrough page. A **system design question** is a short YAML prompt with a rubric. In v1 they map 1:1: each worked design embeds its own question.

**v1 (5):** Clickstream to warehouse · CDC from Postgres to lakehouse · payments ledger reconciliation (fintech) · daily batch with backfills · late & out-of-order events.
**Planned (5):** real-time fraud features · GDPR delete across a lake · multi-tenant SaaS analytics · cost-cutting a runaway warehouse · legacy (Teradata/Ab Initio) → cloud migration.

Each uses the same **design template**: requirements → data contracts → ingestion → storage/format → transform → serving → quality → orchestration & backfill → failure modes → cost → what changes at 10×.

---

## 3. Repo layout

```
de-interview-handbook/
├─ apps/website/                 # Docusaurus v3 site
│  ├─ docs/                      # MDX handbook pages (frontmatter: levels, topic)
│  ├─ blog/
│  ├─ src/
│  │  ├─ components/
│  │  │  ├─ Spoiler/             # hides solutions; respects Mock mode
│  │  │  ├─ LevelBadge/ LevelSwitcher/
│  │  │  ├─ QuestionCard/        # renders one YAML question
│  │  │  ├─ QuestionBank/        # filterable list
│  │  │  ├─ SqlPlayground/       # DuckDB-WASM editor + result grid + checker
│  │  │  ├─ Planner/             # DE 75 planner
│  │  │  └─ MockSession/         # timer, rubric, self-score
│  │  ├─ pages/  (index, playground, planner, mock, questions)
│  │  ├─ context/ (LevelContext, MockModeContext)
│  │  └─ lib/ (progress store in localStorage, ics export)
│  ├─ static/datasets/           # committed parquet seed data for playground
│  └─ docusaurus.config.ts
├─ questions/                    # single source of truth
│  ├─ sql/*.yaml
│  ├─ sql/expected/<id>.csv      # reviewed golden results (see §4.1)
│  ├─ python/*.yaml
│  ├─ modeling/*.yaml
│  ├─ system-design/*.yaml
│  ├─ tools/*.yaml
│  └─ behavioral/*.yaml
├─ datasets/                     # dataset definitions + generator scripts
│  ├─ ecommerce/  rides/  payments/  events/
│  ├─ generate.py                # deterministic: stdlib random.Random(seed), plain Python, no Faker
│  └─ checksums.sha256           # CI regenerates and fails on mismatch
├─ plans/de75.yaml               # planner curriculum (hand-curated order)
├─ schemas/question.schema.json  # JSON Schema for question YAML
├─ scripts/
│  ├─ build-questions.ts         # YAML → JSON bundle the site imports
│  └─ verify_sql.py              # runs every SQL solution, compares to golden CSV
├─ skills/no-spoilers/SKILL.md   # downloadable AI mock-interview prompt (optional)
├─ requirements.txt              # exact == pins (duckdb, pyarrow, pyyaml, …)
├─ .github/workflows/  (ci.yml, deploy.yml)
├─ CONTRIBUTING.md  CODE_OF_CONDUCT.md  LICENSE (MIT)  LICENSE-CONTENT (CC BY-SA 4.0)  README.md  CLAUDE.md
```

### Question YAML schema (example)

```yaml
id: sql-gaps-islands-login-streaks
title: Longest login streak per user
round: sql            # sql | python | modeling | system-design | tools | behavioral
topic: [gaps-and-islands, window-functions]
levels: [mid, senior]
difficulty: medium    # easy | medium | hard
companies: []         # only add with a public source link
dataset: events       # sql only
time_minutes: 20
prompt: |
  Given `logins(user_id, login_date)`, return each user's longest streak
  of consecutive login days. Output: user_id, streak_days. Order by user_id.
hints:
  - Consecutive dates minus a row number give the same value.
solution:
  sql: |
    WITH d AS (SELECT DISTINCT user_id, login_date FROM logins),
    g AS (
      SELECT user_id, login_date,
             login_date - CAST(ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS INT) AS grp
      FROM d)
    SELECT user_id, MAX(cnt) AS streak_days
    FROM (SELECT user_id, grp, COUNT(*) cnt FROM g GROUP BY 1,2)
    GROUP BY 1 ORDER BY 1;
  explanation: |
    ...
check:
  order_matters: true
  float_tolerance: 0.0001
rubric:               # required for non-SQL; optional and small (≤3 points) for SQL
  - point: "Dedupes multiple logins on the same day before ranking"
    weight: 2         # 1–3
    topic: gaps-and-islands   # optional; see weak-topic rule in §4.3
follow_ups:
  - How would you do this incrementally in a daily pipeline?
dialect_notes:
  snowflake:
    note: "Use DATEADD(day, -rn, login_date)."
    source: https://docs.snowflake.com/...   # official vendor docs, required
  sqlserver:
    note: "Use DATEADD(day, -rn, login_date)."
    source: https://learn.microsoft.com/...
resources: []         # optional; left empty in v1 (DataEngTube/DataEngReads links in v2)
```

Non-SQL questions use the same shape, but `solution` holds a model answer (Python: reference solution + example test cases) and `rubric` is required.

---

## 4. Feature specs

### 4.1 SQL Playground (`/playground` + embedded in question pages)
- **Engine:** `@duckdb/duckdb-wasm`, lazy-loaded only on pages that use it (keep the rest of the site fast).
- **Editor:** CodeMirror 6 with SQL highlighting and autocomplete of table/column names from the loaded dataset.
- **Datasets:** 4 deterministic synthetic datasets, **committed** as Parquet in `/static/datasets`:
  - `ecommerce` (customers, orders, order_items, products)
  - `rides` (drivers, riders, trips, ratings)
  - `payments` (accounts, transactions, fx_rates, chargebacks) — fintech flavor
  - `events` (users, logins, page_views, sessions)
- **Determinism:** stdlib `random.Random(seed)`, plain Python, no Faker, NumPy only if needed; pinned deps. `datasets/checksums.sha256` is committed; a CI job regenerates and fails if checksums differ.
- **Schema panel:** tables, columns, types, row counts, "preview 10 rows".
- **Check my answer:** run the user's query and the hidden reference query, then compare result sets (column count, row count, values; order-aware only if `check.order_matters`; float tolerance). Show "✅ Correct", "❌ Wrong row count (got 12, expected 9)", or "❌ Values differ in row 3".
- **Golden results:** `verify_sql.py --update-golden` writes `questions/sql/expected/<id>.csv` (CSV for readable PR diffs; floats rounded to the tolerance). Reviewed by hand once, then committed. CI re-runs every solution and compares against the golden file using the question's `check` rules.
- **Never reveal** the reference query until the user clicks "Show solution" (behind `<Spoiler>`).
- **Dialect notes tab:** how to write the same thing in Snowflake / BigQuery / Databricks / SQL Server / Teradata. Each note has a `source:` link to official vendor docs. Jagadesh reviews Teradata and SQL Server notes personally.
- **Free mode:** blank editor on any dataset for open exploration.
- **Size budget:** each dataset ≤ 5 MB parquet.

### 4.2 DE 75 Study Planner (`/planner`)
- Curriculum in `plans/de75.yaml`: 75 target questions across SQL (30), Python (10), Modeling (10), System design (10), Tools (10), Behavioral (5).
- **v1 ships 55 live:** 30 SQL, 10 modeling, 5 system design, 5 Python, 5 behavioral. The other 20 (5 Python, 5 system design, 10 tools) stay in `de75.yaml` with `planned: true`. CI checks every non-planned ID exists and skips planned ones. The planner hides planned items and shows a "55 / 75 live" counter.
- **Order:** the order in `de75.yaml` is the order — hand-curated (window functions before gaps-and-islands, etc.). No dependency graph. The planner filters by level, focus and role, then slices the remaining list into weeks.
- **Inputs:** level track, weeks available (2–12), hours per week, focus areas (checkboxes), target role type (Data Engineer (generalist, default) / Analytics Eng / Platform DE / Streaming DE / ML Data Eng), **start date** (default next Monday), **study days** (multi-select, default Sat + Sun), **start time** (default 9:00).
- **Role weighting:** harder/leadership items weighted up for Senior+/Lead. ML Data Eng weights feature pipelines, point-in-time correctness, training/serving skew and data versioning.
- **Progress:** check off items, stored in `localStorage` (wrapped in try/catch); progress bar per round.
- **Shareable link:** all inputs + weak topics (`w=gaps-and-islands,scd-type-2`) in URL query params, so the link fully reproduces the plan. Self-scores and progress stay in localStorage only.
- **Export:** `.ics` with one event per study day; hours per week split evenly across chosen days.
- No backend, no login in v1.

### 4.3 Mock Interview Mode (`/mock` + site-wide toggle)
- **Site-wide toggle** in navbar: when ON, every `<Spoiler>` stays locked and hints are hidden.
- **Mock session builder:** choose round (SQL / Python / modeling / system design / behavioral / mixed), level, length (30/45/60 min).
- **Session flow:** questions shown one at a time with a countdown → user types answer / runs SQL → at the end, reveal model answer + rubric → user self-scores each rubric point.
- **Scoring:**
  - Each rubric point is self-scored **strong / partial / missed** = 1 / 0.5 / 0 × weight. Question % = earned / total weight.
  - **SQL:** 60% auto-check (correct = full, wrong = 0) + 40% rubric. If the question has no rubric, the auto-check is 100% of the score.
- **Weak topics:**
  - A missed point with a `topic` marks that topic weak.
  - Fallback: if the question scores **below 60%**, all its `topic` values are marked weak.
- **Debrief page:** % per round, weak topics, "add weak topics to my planner" button (writes the `w=` param).
- **Take it to your AI:** a "Copy as AI mock prompt" button that generates a spoiler-free interviewer prompt for any chatbot (questions only, asks for your answer first, then grades against the same rubric). Optionally ship `skills/no-spoilers/SKILL.md` for agent tools.

### 4.4 Level tracks
- Frontmatter `levels: [junior, mid, senior, lead]` on every doc.
- `LevelSwitcher` in navbar stores choice in `localStorage`; sidebar items not tagged for the level are dimmed (not hidden).
- Each round page opens with a **"What's expected at your level"** box (rendered from frontmatter or a small MDX component).

---

## 5. Phases (execute in Claude Code)

### Phase 1 — Scaffold & conventions
**Prompt for Claude Code:**
> Read PLAN.md. Scaffold the repo per section 3: Docusaurus v3 TypeScript site in `apps/website`, pnpm workspace (pnpm via corepack, pinned `packageManager`), MIT `LICENSE`, CC BY-SA 4.0 `LICENSE-CONTENT`, README crediting Tech Interview Handbook as inspiration and explaining both licenses, CONTRIBUTING.md, CODE_OF_CONDUCT.md, and a CLAUDE.md that summarizes conventions (question YAML schema, no copied content from TIH, levels tags required). Set up ESLint + Prettier, a minimal custom theme (distinct color palette and font from TIH), and GitHub Actions `ci.yml` that runs install, typecheck, and build.

**Done when:** `pnpm dev` serves the site; CI is green. After review: create the public repo and push.

### Phase 2 — Question pipeline
> Create `schemas/question.schema.json` from PLAN.md §3 (including `rubric`, `dialect_notes.{note,source}`, optional `resources`). Write `scripts/build-questions.ts` that validates every YAML in `/questions` against the schema (fail on error) and emits `apps/website/src/data/questions.json`. Build `QuestionCard`, `QuestionBank` (filters: round, level, topic, difficulty), and `Spoiler` components. Add 10 sample SQL questions and 3 modeling questions. Add the validation step to CI.

**Done when:** `/questions` lists and filters the samples; a malformed YAML fails CI.

### Phase 3 — Datasets + SQL Playground
> Write `datasets/generate.py` (stdlib `random.Random(seed)`, pinned deps) producing the 4 datasets in §4.1 as Parquet into `apps/website/static/datasets`, plus `datasets/checksums.sha256`. Build `SqlPlayground` with DuckDB-WASM (lazy-loaded), CodeMirror 6, schema panel, result grid, and the answer checker in §4.1. Write `scripts/verify_sql.py` that runs every SQL solution against the same Parquet files with Python duckdb and compares to `questions/sql/expected/<id>.csv` (`--update-golden` to regenerate). Add both checks (golden compare, dataset checksum) to CI.

**Done when:** a user can solve a sample question in-browser and get ✅/❌; CI fails if any reference solution errors or differs from its golden file, or if regenerated datasets don't match checksums.

### Phase 4 — Core content (v1 scope)
Write original content, levels-tagged, for:
- Start here (4 pages + Roadmap), Resume (3), SQL round + 30 SQL questions, Data modeling + 10 questions, Python round + 5 text-only questions, Pipeline system design framework + 5 worked designs (each embedding its question), Behavioral + DE story bank + 5 questions, Cheatsheets (SQL windows, SCD types, dialect gotchas).

> For each page, write in plain direct language for busy engineers, add a "What's expected at your level" box, link related questions from the bank, and put all answers behind `<Spoiler>`.

**Done when:** every page has `levels` frontmatter; 55 questions pass CI; unwritten sections are hidden.

### Phase 5 — Planner + Mock mode + Level switcher
> Implement §4.2, §4.3, §4.4. Write `plans/de75.yaml` referencing question IDs (CI must fail if a non-planned ID doesn't exist; `planned: true` items are skipped). Progress and settings in localStorage with try/catch. Add ICS export and "Copy as AI mock prompt".

**Done when:** a planner link reproduces the same plan (including weak topics); a 45-min mock session runs end to end and the debrief feeds weak topics into the planner.

### Phase 6 — Polish & launch
> Add local search with `@easyops-cn/docusaurus-search-local` (index docs + blog, highlight terms on target page). Add OG images per page, sitemap, 404, dark mode check, Lighthouse ≥ 90 on home and a docs page. Add `deploy.yml` deploying to GitHub Pages via `actions/deploy-pages` on push to `main`. Add GitHub issue templates: "New question", "Fix answer", "Interview experience".

**Done when:** live at `https://jagadeshjamjala.github.io/de-interview-handbook/`; search works on the deployed site; Lighthouse targets met; README has screenshots + "How to contribute a question" in 5 steps.

### Phase 7 (v2 backlog — after launch)

**Status (2026-11-21):** in progress, one PR per item:
1. ✅ Remaining 20 DE 75 questions (5 Python, 5 system design with worked designs, 10 tools) → DE 75 at 75/75
2. ✅ Tool deep-dive pages (Spark, Kafka, Airflow, dbt, Snowflake, BigQuery, Databricks, Iceberg/Delta)
3. ✅ Python playground (Pyodide, self-hosted)
4. ✅ Flashcards from `follow_ups` (prompts now; optional `{q, a}` answers can be added per follow-up)

**Deferred to future builds (decided):** company interview loops, custom domain, DataEngTube/DataEngReads cross-links (waiting on links), offer section (waiting on cited sources).

### Phase 8 — Practice tools (2026-11-21)
The deferred Phase 7 items that need no outside input, one PR each:
1. Skill radar (`/radar`): rate 8 skills 1–5; skills rated ≤ 2 add their topics to the planner's `w=` weak topics.
2. Incident drills (`/drills`): 3 branching scenarios; weak moves loop back with feedback, the debrief links related questions.
3. Pipeline design canvas (`/canvas`): drag or arrow-key boxes per stage, button-driven connections, automatic diagram checks, a 9-item self-review checklist and copy-as-text; saved per browser.

- Python playground (Pyodide) with test cases
- Pipeline design canvas (drag boxes: source → ingest → store → transform → serve) with a self-review checklist
- Incident drills: branching "what do you check next?" scenarios
- Skill radar self-assessment that seeds the planner
- Company interview loops (only from public, linked sources)
- Spaced-repetition flashcards from question `follow_ups`
- Spark / Kafka deep-dive pages with diagrams
- Remaining 20 planned DE 75 questions (5 Python, 5 system design, 10 tools)
- Offer section, once real cited compensation sources exist
- Cross-links to your DataEngTube videos and DataEngReads case studies per topic, using each question's `resources:` field
- Custom domain (add `static/CNAME`, update `SITE_BASE_URL`)

---

## 6. Guardrails for Claude Code
- **Never copy** TIH text or other paid/copyrighted question banks. Write original questions; real-company tags need a public source link.
- Keep the site static: no backend, no accounts, no analytics that need cookie banners in v1 (Plausible/Umami fine later).
- DuckDB-WASM and datasets load **only** on playground/question pages.
- All SQL solutions must match their reviewed golden result in `verify_sql.py` before merge.
- Every content file must have `levels` and `topic` frontmatter.
- Every dialect note needs a `source:` link to official vendor docs.

## 7. Hosting, search & later decisions

**Hosting — GitHub Pages (decided)**
- No domain yet, so the site lives at `https://jagadeshjamjala.github.io/de-interview-handbook/`.
- In `docusaurus.config.ts`: `url: 'https://jagadeshjamjala.github.io'`, `baseUrl: '/de-interview-handbook/'`, `trailingSlash: false`.
- **Important:** all static asset paths (Parquet datasets, DuckDB-WASM bundles, images) must go through `useBaseUrl()` — never hardcode `/datasets/...`, or the playground breaks on Pages.
- Self-host the DuckDB-WASM `.wasm` + worker files in `static/duckdb/` (don't rely on a CDN); GitHub Pages serves `.wasm` with the right MIME type.
- Keep `baseUrl` in one env var (`SITE_BASE_URL`) so switching to a custom domain later is a one-line change plus a `static/CNAME` file.

**Search — local search plugin (decided)**
- `@easyops-cn/docusaurus-search-local`: works offline on GitHub Pages, no approval or API keys, index built at deploy time.
- Revisit Algolia DocSearch only if the site outgrows it (slow index, 500+ pages). Swapping later is config-only.

**Domain — not decided.** Nothing in v1 depends on it.

**Cross-links to DataEngTube / DataEngReads — v2.** See Phase 7. The schema's optional `resources:` list exists from Phase 2, empty in v1.
