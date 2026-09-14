# Project toolchain

<!-- AI modified: the repository now uses official Vite/Vitest packages with pnpm as the toolchain entry point. -->

This project uses pnpm for dependency and script execution, Vite for development and production builds, Vitest for unit tests, vue-tsc for type checks, ESLint for both formatting and semantic linting, and Playwright for browser verification.

## Commands

- Install dependencies with `pnpm install`; use `--frozen-lockfile` in CI and release verification.
- Use `pnpm run dev`, `pnpm run build`, and `pnpm run preview` for the Vite lifecycle.
- Use `pnpm run test:unit --run` for one-shot unit tests and `pnpm run test:coverage` for the release coverage gate.
- Use `pnpm run check` for all TypeScript projects plus ESLint-owned formatting and semantic rules.
- Use `pnpm run verify` for the reproducible local/PR gate and `pnpm run release:check` for the browser-complete release gate.
- Use `pnpm run doctor` for read-only local diagnostics and `pnpm run docs:check` for documentation contracts.
- Use `pnpm run format` or `pnpm run lint:fix` for mechanical ESLint fixes.
- Use `pnpm exec <binary>` for one-off local binaries and `pnpm add`, `pnpm remove`, or `pnpm update` for dependency changes.

## Configuration boundaries

- Import Vite configuration APIs from `vite`, test configuration APIs from `vitest/config`, and test functions from `vitest`.
- Keep Vite application/build behavior in `vite.config.ts` and Vitest environment/coverage behavior in `vitest.config.ts`.
- ESLint is the only mechanical formatter. Do not add Prettier, Oxfmt, Oxlint, or Stylelint without an explicit toolchain decision.
- ESLint formatting covers JavaScript, TypeScript, Vue, JSON, YAML, and Markdown. CSS and standalone HTML retain their existing style without a mechanical formatter.
- Husky and lint-staged provide the local pre-commit check; CI remains authoritative.
- Keep dependency versions in the pnpm catalog and retain the pnpm version pinned by `packageManager`.

## Review checklist for agents

- [ ] Run `pnpm install --frozen-lockfile` after dependency or lockfile changes.
- [ ] Run `pnpm run check` and the relevant tests for every change.
- [ ] Run the complete release gate for toolchain, dependency, build, browser, security, or deployment changes.

## Product documentation synchronization

<!-- AI modified: product decisions must survive conversation compaction and future agent handoffs. -->

- At the end of every user turn, review whether the conversation introduced, changed, confirmed, or withdrew a product, design, architecture, interaction, API, or business-rule decision.
- When a decision changed, update the relevant product documents in the same turn before the final response. At minimum, check `e.md`, `docs/prototype-plan.md`, and the applicable files under `docs/product/`.
- Record the resulting decision and its status, not a verbatim chat transcript. Clearly distinguish planned, prototyped, implemented, inspected, and executed work.
- If the turn introduces no product-document change, do not create a meaningless documentation edit; the review itself still remains required.
- Never claim that product documentation was synchronized unless the affected files were actually updated and verified.

## Project release gates

<!-- AI modified: typed entry points keep the local and CI release sequence identical and restore production output. -->

Run the complete release gate from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run release:check
```

`pnpm run verify` covers read-only CI diagnostics, every TypeScript project, ESLint, documentation, contracts, security, inventory, the production audit, coverage, and a production build. `pnpm run release:check` adds the Mock build and three-browser E2E, then restores a production `dist` even after failure. See [Testing and visual acceptance](./docs/testing.md) for the evidence policy.

<!-- AI modified: documented the repository conventions used by Matt Pocock's engineering skills. -->

## Agent skills

### Issue tracker

Issues and specs are tracked in this repository's GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five canonical labels without overrides. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses the single-context domain documentation layout. See `docs/agents/domain.md`.
