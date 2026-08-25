# Contributing

## Development setup

Use pnpm as the package and script entry point:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

<!-- AI modified: dependency and task commands now resolve the repository-pinned pnpm toolchain directly. -->

Use `pnpm add`, `pnpm remove`, and `pnpm update` for dependency changes. Keep Vite and Vitest versions in `pnpm-workspace.yaml`; do not add an alternative formatter or linter without an explicit toolchain decision.

## Change scope

- Fix the cause with the smallest coherent change and follow existing feature boundaries.
- Keep TypeScript strict; do not introduce `any` or disable lint rules.
- Follow the naming and AI-modification comment rules in `AGENTS.md`.
- Add or update tests for behavior changes and update contracts/documentation in the same pull request.
- Never commit credentials, local `.env` files, generated build output, or browser artifacts.

## Required checks

Run the release gates documented in `docs/testing.md`. At minimum, before requesting review:

```sh
pnpm run check
pnpm run check:contracts
pnpm run check:security
pnpm run test:inventory
pnpm run test:unit --run
pnpm run build
```

Changes to user journeys, layout, accessibility, or visual behavior also require the relevant Playwright projects and inspected artifacts. Dependency changes require `pnpm install --frozen-lockfile` and `pnpm audit --prod --audit-level high` after the lockfile is updated.

## Pull requests

Describe the problem, root cause, user-visible result, verification executed, and remaining assumptions. Link issues, call out security or compatibility risks, and include screenshots only when they materially help review. Keep unrelated refactors in separate pull requests.
