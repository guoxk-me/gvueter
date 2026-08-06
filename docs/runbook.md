# Operations runbook

## Purpose and ownership

This runbook covers the static Gvueter frontend, its Nginx runtime, and the browser-to-API dependency boundary. The deployment owner must maintain the real service name, dashboard links, alert routing, and escalation contacts in the platform configuration; they are intentionally not invented in this repository.

## Pre-deployment

1. Record the release SHA and immutable container digest.
2. Execute every gate in `docs/testing.md`, including the final non-Mock build.
3. Confirm `VITE_API_BASE_URL`, notification WebSocket URL/origins, navigation origins, `CSP_CONNECT_SRC`, and `CSP_FRAME_SRC` describe the same approved origins.
4. Confirm the backend accepts the frontend contract version and that no schema, authentication, or authorization migration is pending.
5. Retain the previously healthy image digest for rollback.

## Deployment and health

Deploy progressively when the platform supports it. The container listens on `8080` as an unprivileged user.

- `GET /healthz`: Nginx and static delivery liveness; expected status `200` and body `ok`.
- `GET /readyz`: backend dependency readiness; expected status `200` from gnester-lite's `/health/ready` endpoint.
- `GET /`: expected status `200`, HTML content type, security headers, and `Cache-Control: no-cache`.
- `GET /assets/<fingerprinted-file>`: expected immutable one-year cache policy plus the same security headers.

Do not route traffic based only on `/healthz`: a healthy static server can still have an unavailable or incompatible API. Do not restart the frontend solely because `/readyz` reports an upstream outage.

## Post-deployment smoke

Using a non-privileged test account and an approved administrator account:

1. Load a deep history-mode route directly and refresh it.
2. Sign in with password and SSO, verify tenant-scoped navigation, refresh the SSO session, then sign out and confirm protected data is cleared.
3. Complete one representative read and mutation allowed for each role; verify a forbidden action is rejected by the API.
4. Confirm notification polling/WebSocket behavior and that no bearer credential is sent to an unapproved origin.
5. Inspect CSP, frame, content-type, referrer, permissions, and cache headers on `/`, `/assets/`, `/sso/callback`, `/healthz`, and `/readyz`; the SSO callback must be `no-store` and `no-referrer`.

## Incident triage

| Symptom                             | First checks                                                                               | Likely owner      |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| `/healthz` fails                    | pod/container state, port `8080`, Nginx logs, filesystem mount                             | frontend/platform |
| `/healthz` passes, `/readyz` fails  | backend health, DNS/service discovery, network policy, proxy target                        | backend/platform  |
| Blank page or chunk error           | release asset completeness, `index.html` cache, asset hash availability, CSP console error | frontend/CDN      |
| Sign-in loop or widespread 401      | identity/backend health, cookie/session policy, API base URL, clock skew                   | identity/backend  |
| SSO unavailable or callback failure | SSO enabled/config revision, IdP health, exact redirect URI, state/nonce/PKCE, ticket TTL  | identity/backend  |
| Missing menus or cross-tenant state | `/auth/me`, navigation response, tenant key, session-boundary logs                         | frontend/backend  |
| Notifications disconnected          | WebSocket URL, secure-origin allow-list, `connect-src`, proxy upgrade support              | frontend/platform |

Capture the release SHA, request/correlation ID, timestamp and timezone, route, role/tenant (without personal data), browser version, response status, and sanitized console/network evidence. Never paste tokens, cookies, raw email addresses, or request bodies containing secrets into incident systems.

## Escalation and recovery

Freeze rollout when errors, authorization anomalies, data leakage, or core-flow failures exceed the deployment's agreed budget. For a release-linked regression, follow `docs/rollback.md`. For an upstream incident, keep the last healthy frontend in service when safe, communicate the dependency status, and avoid repeated restarts that erase evidence.
