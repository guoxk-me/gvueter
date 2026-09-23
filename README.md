# Gvueter

Gvueter is a Vue 3 frontend foundation. It retains the toolchain, official shadcn-vue primitives, runtime API configuration, PWA capability, and deployment pipeline. The public home page works without a backend. Previous admin business modules, Mock handlers, and API contracts have been removed.

## Requirements

Node.js `>=24.18.0 <25` and pnpm `12.4.1` are pinned by `.node-version` and `package.json`. Dependency declarations and the pnpm lockfile are intentionally retained for future application work.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

The application reads [runtime-config.json](./public/runtime-config.json) before mounting Vue. It contains only a public API base URL. No login or backend connection is required for the starter page.

## Verification

```sh
pnpm run check
pnpm run test:unit --run
pnpm run build
pnpm run release:check
```

`pnpm run verify` is the reproducible local and CI gate. `pnpm run release:check` adds browser and PWA checks and restores a standard production build.

## Architecture

- [Frontend architecture](./docs/admin-architecture.md)
- [API integration boundary](./docs/api-contracts.md)
- [Deployment](./docs/deployment.md)
- [PWA](./docs/pwa.md)
- [Testing](./docs/testing.md)
- [Security](./docs/security.md)
- [Observability](./docs/observability.md)
- [Performance](./docs/performance.md)
- [Runbook](./docs/runbook.md)
- [Rollback](./docs/rollback.md)

The future gnester-lite integration is opt-in. Set `PUBLIC_API_BASE_URL=/api/v1` and `API_UPSTREAM` when the backend is available. This repository does not claim that old admin endpoints exist in gnester-lite.
