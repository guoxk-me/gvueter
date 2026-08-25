# Project toolchain

<!-- AI modified: the repository now uses official Vite/Vitest packages with pnpm as the toolchain entry point. -->

This project uses pnpm for dependency and script execution, Vite for development and production builds, Vitest for unit tests, vue-tsc for type checks, ESLint for both formatting and semantic linting, and Playwright for browser verification.

## Commands

- Install dependencies with `pnpm install`; use `--frozen-lockfile` in CI and release verification.
- Use `pnpm run dev`, `pnpm run build`, and `pnpm run preview` for the Vite lifecycle.
- Use `pnpm run test:unit --run` for one-shot unit tests and `pnpm run test:coverage` for the release coverage gate.
- Use `pnpm run check` for all TypeScript projects plus ESLint-owned formatting and semantic rules.
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

## Project release gates

<!-- AI modified: the release matrix preserves browser, security, coverage, Mock, PWA, and bundle evidence. -->

Run the complete release gate from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run check:contracts
pnpm run check:security
pnpm run test:inventory
pnpm audit --prod --audit-level high
pnpm run test:coverage
VITE_ENABLE_MOCKS=false pnpm run build
VITE_ENABLE_MOCKS=true pnpm run build
CI=true VITE_ENABLE_MOCKS=true pnpm run test:e2e
VITE_ENABLE_MOCKS=false pnpm run build
```

`pnpm run check` covers every TypeScript project, including Playwright specifications, plus ESLint formatting and semantic rules. `pnpm run test:coverage` runs the unit suite and enforces the configured V8 thresholds. The Mock-enabled build exists only for deterministic browser verification and must not be deployed, so the final command restores a production `dist`. See [Testing and visual acceptance](./docs/testing.md) for the evidence policy.
