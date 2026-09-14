# Gvueter Admin

A production-oriented Vue 3 admin template built around configurable appearance, backend-driven navigation, CASL permissions and reusable business components. The repository uses pnpm with official Vite and Vitest packages.

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

<!-- AI modified: one Node 24 baseline keeps local, CI, and container behavior reproducible. -->

Node.js `>=24.18.0 <25` and pnpm `12.4.1` are required. Version managers can read the repository's `.node-version` file.

<!-- AI modified: older pnpm launchers may not activate pnpm 12's native executable correctly. -->

If upgrading from pnpm 10, use `corepack pnpm install --frozen-lockfile` and `corepack pnpm run dev` until your pnpm launcher is upgraded. CI installs the native runtime directly through the official `pnpm/setup` action; no global package-manager change is required for local verification.

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

When `VITE_ENABLE_MOCKS` is unset, the development server starts MSW automatically. Copying the shipped `.env.example` disables it; set `VITE_ENABLE_MOCKS=true` explicitly when Mock accounts are required:

| Role          | Email                | Password    |
| ------------- | -------------------- | ----------- |
| Administrator | `admin@example.com`  | `admin123`  |
| Editor        | `editor@example.com` | `editor123` |
| Viewer        | `viewer@example.com` | `viewer123` |

The Mock system configuration enables “Mock Enterprise SSO” by default so the full redirect, callback, one-time ticket exchange, session restore, and logout path can be exercised without a real identity provider. Production SSO requires the backend endpoints documented in the OpenAPI contract; no OAuth client secret belongs in a Vite environment variable or browser bundle.

## Verification

<!-- quality-commands:start -->
- `pnpm run verify` runs the reproducible PR and local quality gate.
- `pnpm run release:check` adds the Mock build, three-browser E2E, and guaranteed production artifact restoration.
<!-- quality-commands:end -->

Use `pnpm run doctor` for a read-only local environment diagnosis. Individual commands such as `pnpm run check`, `pnpm run test:unit --run`, and `pnpm run test:coverage` remain available during development.

<!-- AI modified: ESLint is the single formatting and semantic gate after the standard Vite migration. -->

`pnpm run check` combines `vue-tsc --build` with the Antfu ESLint configuration. Use `pnpm run format` for mechanical ESLint fixes; CSS and standalone HTML intentionally retain their existing style without an additional formatter. See [Testing and visual acceptance](./docs/testing.md) for the production/Mock build split, browser prerequisites, and complete evidence policy.

## Product documentation

<!-- AI modified: expose the four detailed product documents without conflating confirmed targets with the current implementation. -->

- [01 产品总览文档](./docs/product/01-product-overview.md)
- [02 业务规则](./docs/product/02-business-rules.md)
- [03 技术开发](./docs/product/03-technical-development.md)
- [04 UI 与交互](./docs/product/04-ui-and-interaction.md)

These documents distinguish the confirmed product and prototype targets from inspected repository behavior and remaining implementation gaps. They are not a release-certification report.

<!-- AI modified: link the confirmed Permission decisions to the existing product sources instead of creating a parallel specification. -->
The confirmed `08 — Permission` scope is documented in [business rules](./docs/product/02-business-rules.md#3-角色权限与数据范围), [implementation contracts](./docs/product/03-technical-development.md#103-permission-阶段的已确认目标契约), and [UI flows](./docs/product/04-ui-and-interaction.md#103-角色管理与授权-drawer). Prototype progress and review evidence remain in the [prototype plan](./docs/prototype-plan.md).

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
