# Changelog

All notable changes to this project are documented here.

## Unreleased

No unreleased changes.

## 0.1.0 - 2026-07-22

### Added

- Centralized persisted appearance settings with theme, semantic colors, density, layouts and interface switches.
- Backend-driven safe menu compilation, dynamic routes, CASL gates, data scopes, tabs and KeepAlive contracts.
- Typed authentication, captcha, profile and password flows with 401/403 request policies.
- Reusable admin components, TanStack table foundations, MSW handlers and Vitest/Playwright coverage.
- Dashboard, message center/realtime transport, form workbench, content/audit, monitoring, dictionaries, grouped configuration and generic system-parameter vertical slices.
- Production business components including SearchForm, ProTable, selectors, upload flows, Markdown/JSON/code views, Canvas image cropper and themed QR-code export.
- Docker, Nginx, CI and deployment examples.
- Real UTF-8 CSV user import with partial-result reporting, round-trip-safe export headers and server-side role-assignment checks.
- Editable role data scopes, a dedicated `RolePolicy` ability, permission identifiers in route metadata and shared Dashboard/notification/audit data sources.
- Independent Table, Form, upload/drag, selection, editor, icon and primitive modules with maturity metadata, business demos and state coverage.
- Six-layout responsive Shell acceptance, long-text/visual baselines, accessible keyboard/focus contracts, contrast gates and deterministic browser matrices.
- Typed page-state/URL, API, security, performance and observability contracts with executable Mock failure scenarios and bundle budgets.
- Split Oxfmt/Oxlint and semantic vue-tsc/ESLint ownership, added Playwright to the shared TypeScript project gate, and configured separate production and Mock-preview CI build gates.

### Security

- Protected MSW endpoints independently authorize writes to demonstrate that hidden UI controls are not access control.
- Settings/Content reads enforce backend permission policy; login and forgot-password responses prevent account enumeration.
- Principal changes clear protected Query data and isolate persisted notification projections by account and tenant.
- Token expiry, original-byte upload validation, safe download filenames and deployment-owned navigation origins are covered by frontend contracts.
- Dynamic API authorization reads the same role policy as CASL, and successful business mutations populate the shared masked audit stream.
