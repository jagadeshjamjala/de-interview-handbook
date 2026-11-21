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

The question format and the step-by-step "add a question" guide arrive with the question pipeline. See [PLAN.md](PLAN.md) §3.
