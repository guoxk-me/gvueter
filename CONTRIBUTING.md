# Contributing

## Development setup

Use Vite+ as the only package and toolchain entry point:

```sh
vp install --frozen-lockfile
vp dev
```

Use `vp add`, `vp remove`, and `vp update` for dependency changes. Do not run pnpm, npm, Yarn, Vitest, Oxlint, Oxfmt, or tsdown directly. Keep Vite+, its core alias, and its test alias pinned to the same release.

## Change scope

- Fix the cause with the smallest coherent change and follow existing feature boundaries.
- Keep TypeScript strict; do not introduce `any` or disable lint rules.
- Follow the naming and AI-modification comment rules in `AGENTS.md`.
- Add or update tests for behavior changes and update contracts/documentation in the same pull request.
- Never commit credentials, local `.env` files, generated build output, or browser artifacts.

## Required checks

Run the release gates documented in `docs/testing.md`. At minimum, before requesting review:

```sh
vp check
vp run check
vp run check:contracts
vp run check:security
vp run test:inventory
vp test run
vp run build
```

Changes to user journeys, layout, accessibility, or visual behavior also require the relevant Playwright projects and inspected artifacts. Dependency changes require `vp install --frozen-lockfile` and `vp pm audit --production --level high` after the lockfile is updated.

## Pull requests

Describe the problem, root cause, user-visible result, verification executed, and remaining assumptions. Link issues, call out security or compatibility risks, and include screenshots only when they materially help review. Keep unrelated refactors in separate pull requests.
