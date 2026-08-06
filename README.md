# Gvueter Admin

A production-oriented Vue 3 admin template built around configurable appearance, backend-driven navigation, CASL permissions and reusable business components. The repository uses Vite+ (`vp`) as the only development toolchain entry point.

## Stack

- Vue 3, TypeScript, Vue Router and Pinia with persisted state
- Tailwind CSS, reka-ui and shadcn-vue-style primitives
- Axios and TanStack Vue Query/Table/Virtual
- CASL for route and component UX permissions
- vee-validate with Zod, vue-i18n and vue-sonner
- Unovis charts plus production-oriented image crop and QR-code business components
- MSW, Vitest and Playwright

The frontend permission layer improves the user experience. Every protected backend operation must still authorize the caller; hiding a button is not access control.

## Start locally

<!-- AI modified: the documented runtime range matches Babel 8's exact supported Node branches. -->

Node.js `^22.18.0 || >=24.11.0` is required. CI and the production container use Node.js 24.18.0.

```sh
vp install --frozen-lockfile
vp dev
```

When `VITE_ENABLE_MOCKS` is unset, the development server starts MSW automatically. Copying the shipped `.env.example` disables it; set `VITE_ENABLE_MOCKS=true` explicitly when Mock accounts are required:

| Role          | Email                | Password    |
| ------------- | -------------------- | ----------- |
| Administrator | `admin@example.com`  | `admin123`  |
| Editor        | `editor@example.com` | `editor123` |
| Viewer        | `viewer@example.com` | `viewer123` |

The Mock system configuration enables “Mock Enterprise SSO” by default so the full redirect, callback, one-time ticket exchange, session restore, and logout path can be exercised without a real identity provider. Production SSO requires the backend endpoints documented in the OpenAPI contract; no OAuth client secret belongs in a Vite environment variable or browser bundle.

## Verification

```sh
# Unified Vite+ formatting and Oxlint gate
vp check

# All TypeScript projects (including E2E) and semantic Antfu ESLint rules
vp run check

# Unit tests
vp test run

# Unit tests with enforced release coverage thresholds
vp run test:coverage

# Contract, sensitive-file, and test-inventory policy gates
vp run check:contracts
vp run check:security
vp run test:inventory

# Type-check, production build, and bundle budget
vp run build

# Local E2E (see docs/testing.md for the release-equivalent Mock preview)
vp run test:e2e
```

`vp check` is the repository-wide Oxfmt/Oxlint gate. `vp run check` remains a required non-mutating supplement for all TypeScript projects and semantic Antfu ESLint rules. Oxfmt is the only mechanical formatter; see [Testing and visual acceptance](./docs/testing.md) for the production/Mock build split and complete release matrix.

<!-- AI modified: make the pre-1.0 toolchain risk explicit instead of implying semver-stable behavior. -->

Vite+ is a pre-1.0 beta dependency. The dependency catalog pins the local core/test packages and coverage provider to the 0.1.19 compatibility set; CI and Docker also pin the global CLI to 0.1.19, while a developer's global `vp` binary is managed outside this repository. Upgrade the set only as one reviewed migration followed by the complete release matrix.

## Architecture

- [Admin architecture](./docs/admin-architecture.md)
- [Admin page design contract](./docs/page-design-contract.md)
- [CASL ability setup](./docs/casl-ability-setup.md)
- [Frontend security checklist](./docs/security.md)
- [DOM directive capability decisions](./docs/dom-capability-decisions.md)
- [API and Mock contract](./docs/api-contracts.md)
- [Example data contract](./docs/example-data.md)
- [OpenAPI schema](./docs/openapi.yaml)
- [Frontend observability](./docs/observability.md)
- [Performance contract](./docs/performance.md)
- [Progressive Web App](./docs/pwa.md)
- [Testing and visual acceptance](./docs/testing.md)
- [Deployment](./docs/deployment.md)
- [Operations runbook](./docs/runbook.md)
- [Rollback guide](./docs/rollback.md)
- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)

Feature modules keep route pages thin: a page composes focused components and Vue Query operations, while Pinia is reserved for cross-page or persisted state. Shared design tokens live in CSS variables and are activated from the centralized appearance store.

## Environment

Copy [`.env.example`](./.env.example) to a local ignored `.env` only when explicit values are needed. Deployment values belong in the platform environment and must never contain secrets:

```sh
VITE_API_BASE_URL=/api
VITE_ENABLE_MOCKS=true
VITE_NOTIFICATION_WS_URL=
VITE_NOTIFICATION_WS_ALLOWED_ORIGINS=
# Optional cross-origin production example:
# VITE_NOTIFICATION_WS_URL=wss://admin.example.com/notifications
# VITE_NOTIFICATION_WS_ALLOWED_ORIGINS=wss://admin.example.com
VITE_NAVIGATION_ALLOWED_ORIGINS=https://docs.example.com,https://support.example.com
```

For a production build paired with gnester-lite, use `VITE_API_BASE_URL=/api/v1` and `VITE_ENABLE_MOCKS=false`.

<!-- AI modified: the production bundle now enforces the Mock boundary instead of relying on runtime inactivity. -->

`VITE_ENABLE_MOCKS` is intended for local/demo builds only. A production build resolves the browser-Mock entry to a no-op, removes `mockServiceWorker.js`, and fails the bundle gate if either the real handler entry or worker leaks into `dist`. Production authentication and authorization remain backend responsibilities.
Leaving `VITE_NOTIFICATION_WS_URL` empty keeps the optional realtime transport in memory; configure a trusted socket explicitly for production realtime delivery.
`VITE_NOTIFICATION_WS_ALLOWED_ORIGINS` is the explicit secure-origin allow-list for bearer-authenticated notification sockets; same-origin sockets do not need an entry.
`VITE_NAVIGATION_ALLOWED_ORIGINS` is a comma-separated build-time allow-list for backend-controlled external and iframe destinations. Entries are canonicalized to exact HTTPS origins; scheme, hostname, subdomain, and non-default port must match. Same-origin HTTP(S) paths are accepted for local development, while URL credentials are always rejected.
