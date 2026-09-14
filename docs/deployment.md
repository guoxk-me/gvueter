# Deployment

## Build contract

<!-- AI modified: deployment guidance now states the shipped container's real same-origin API boundary. -->

<!-- AI modified: deployment uses the same single Node 24 line as local development and CI. -->

The frontend is a history-mode SPA and requires Node.js `>=24.18.0 <25` to build. The shipped container and CI use Node.js 24.18.0. Its supported default is the same-origin `/api` base proxied by the included Nginx configuration:

```sh
VITE_API_BASE_URL=/api/v1 \
VITE_ENABLE_MOCKS=false \
VITE_NOTIFICATION_WS_URL=wss://admin.example.com/notifications \
VITE_NOTIFICATION_WS_ALLOWED_ORIGINS=wss://admin.example.com \
VITE_NAVIGATION_ALLOWED_ORIGINS=https://docs.example.com \
pnpm run build
```

<!-- AI modified: paired deployment must preserve gnester-lite's versioned production API prefix. -->

When this frontend is paired with `gnester-lite`, build it with `VITE_API_BASE_URL=/api/v1`. The included Nginx proxy removes only the `/api` gateway prefix, so the backend receives `/v1/...`, matching `gnester-lite`'s default URI-versioning contract. Keep the plain `/api` value only for backends whose application routes are unversioned.

<!-- AI modified: production exclusion is an executable artifact contract, not just operator guidance. -->

`VITE_ENABLE_MOCKS=true` is reserved for demos and end-to-end tests. Never enable MSW as a substitute for a production backend. With the flag false or omitted during a build, Vite replaces the browser-Mock module with a typed no-op and removes `mockServiceWorker.js`; the bundle gate fails if the real handler entry or worker remains in `dist`.

## Container

The included multi-stage `Dockerfile` creates static assets and serves them through Nginx:

```sh
docker build \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  --build-arg VITE_ENABLE_MOCKS=false \
  --build-arg VITE_NOTIFICATION_WS_URL=wss://admin.example.com/notifications \
  --build-arg VITE_NOTIFICATION_WS_ALLOWED_ORIGINS=wss://admin.example.com \
  --build-arg VITE_NAVIGATION_ALLOWED_ORIGINS=https://docs.example.com \
  -t gvueter-admin:0.1.0 .

docker run --rm \
  -p 8080:8080 \
  -e "API_UPSTREAM=backend:8080" \
  -e "CSP_CONNECT_SRC='self' wss://admin.example.com" \
  -e "CSP_FRAME_SRC='self' https://docs.example.com" \
  gvueter-admin:0.1.0
```

The build and runtime base images are pinned by multi-architecture digest. The runtime uses the unprivileged Nginx image, listens on `8080`, and explicitly runs as `nginx`. `API_UPSTREAM` is a trusted runtime `host:port` value and defaults to `backend:8080`; the service must be resolvable and reachable on the container network. Nginx resolves it only when `/api/` or `/readyz` is requested, so an unavailable backend does not prevent the static frontend or `/healthz` from starting. Replace the upstream for the deployment platform while retaining the same-origin `/api` boundary.

The stock container does not claim turnkey support for a custom cross-origin API. Such a deployment must rebuild with the intended absolute `VITE_API_BASE_URL`, add the HTTPS API origin to CSP `connect-src`, configure the API's CORS policy for the exact frontend origin, methods and request headers, and replace the same-origin `/readyz` dependency probe with a health check appropriate for that external service. Review TLS/SNI and credential handling in the replacement proxy or platform ingress before enabling traffic. The shipped SSO entry deliberately requires the same-origin `/api` gateway so transaction cookies and fixed callback origins cannot drift; a cross-origin API deployment must provide an equivalent same-origin authentication gateway.

`/healthz` is an Nginx/static-asset liveness check. `/readyz` proxies gnester-lite's `/health/ready` endpoint and is the dependency-aware readiness check for an orchestrator. Do not use readiness failure to restart a healthy frontend indefinitely; investigate the backend or service network first.

## Reverse proxy requirements

- Route unknown non-asset URLs to `/index.html` for Vue Router history mode.
- Cache fingerprinted `/assets/` files as immutable; do not cache `index.html` long term.
- Preserve `Authorization` and request identifiers when proxying `/api/`.
- Honor backend `Cache-Control: no-store` on `/api/uploads/policy` and `/api/system-config`; do not add an intermediary cache for either configuration projection.
- Forward `/api/auth/sso/start` and the identity-provider callback without deriving their externally registered scheme/host from untrusted headers; use only trusted proxy metadata and an exact callback allow-list.
- Restrict iframe origins in both the backend menu policy and Content Security Policy.
- Serve only HTTPS outside a private development environment.
- Route liveness to `/healthz` and traffic readiness to `/readyz`.

<!-- AI modified: deployment caching and the browser recovery boundary form one stale-release contract. -->

The included Nginx configuration serves `index.html` with `Cache-Control: no-cache` and fingerprinted assets as immutable. Keep both rules together: after a rolling release removes an old lazy chunk, Vite's `vite:preloadError` enters the manual application-recovery screen, and a user-approved reload retrieves the current HTML and asset graph. Do not replace this with automatic reload; an offline client, blocked request, or incomplete deployment could otherwise loop and discard unsaved administrative work.

## Runtime boundaries

Vite variables are compiled into the client bundle and are never secrets. Credentials, signing keys, refresh-token rotation and tenant authorization belong to the backend or deployment secret store.

The provided CSP permits inline styles because theme CSS variables and some reka-ui positioning are applied through style attributes. It does not permit inline scripts. Runtime `CSP_CONNECT_SRC` and `CSP_FRAME_SRC` default to `'self'`; values use CSP source-expression syntax, separated by spaces. Nginx suppresses access logging and referrers for reset-password and SSO callback paths; the SSO callback is also `no-store`.
Keep `VITE_NOTIFICATION_WS_ALLOWED_ORIGINS`, `VITE_NAVIGATION_ALLOWED_ORIGINS`, and the deployed `connect-src`/`frame-src` sources aligned. A WebSocket origin belongs in both the notification allow-list and `CSP_CONNECT_SRC`; an iframe origin belongs in both the navigation allow-list and `CSP_FRAME_SRC`. Adding an origin to one layer never authorizes the other.

<!-- AI modified: the runtime boundary distinguishes the global administrative ceiling from deploy-time and endpoint ceilings. -->

The stock Nginx `client_max_body_size 5m` is the shipped platform ceiling and matches the current content-file business ceiling. Raising `maxFileSizeMb` in system configuration cannot enlarge either that proxy limit or an endpoint's own type/size policy; the effective upload rule is always their intersection. A deployment that introduces a genuinely larger upload API must deliberately raise the trusted ingress and backend limits together, retain bounded streaming/storage behavior, and verify the resulting denial-of-service exposure. Lower global limits and removed extensions still narrow supported business uploads immediately.

Local-storage filesystem roots and S3 credentials remain backend/deployment concerns. Ordinary upload workflows receive only the no-store `/uploads/policy` projection and continue to call same-origin application upload APIs. The Settings projection may return the access-key ID and a secret mask for administration, but no browser path may receive the raw secret, a usable AK/SK pair, or persist either in frontend storage. Production backends should restrict configurable object-storage endpoints to approved destinations and store secrets in a protected secret facility rather than frontend environment variables or logs.

<!-- AI modified: deployment policy now matches the shared menu URL validator exactly. -->

Allow-list entries are canonicalized to exact HTTPS origins. `https://docs.example.com/help/` permits targets on `https://docs.example.com` with any path, query, or hash, but does not permit `http://docs.example.com`, `https://api.docs.example.com`, or `https://docs.example.com:8443`. Credentials in configured or target URLs are rejected. Redirect destinations must be revalidated by the backend and allowed by the deployed CSP.

## Release checks

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

<!-- AI modified: browser verification uses a disposable Mock preview while the final artifact is rebuilt without MSW. -->

The GitHub Actions workflow pins every action commit, Node.js 24.18.0 and pnpm 12.4.1, publishes an SPDX SBOM from the production container image, audits production dependencies, and runs behavioral E2E in Chromium, Firefox, and WebKit with MSW explicitly enabled. Chromium alone owns pixel baselines. A Mock-enabled `dist` is test-only and must be replaced by the final non-Mock build before deployment.
CI jobs use isolated workspaces: the container gate waits for verification and E2E, then performs its own production-only image build from the checked-out source instead of consuming the Mock E2E `dist`.
<!-- AI modified: official Vite and Vitest versions are catalog-owned and verified through the release matrix. -->
Upgrade Vite, Vitest, the V8 provider, TypeScript, or ESLint only as a reviewed toolchain change followed by the complete release checks.
The deterministic data, locale, timezone, viewport and screenshot policy is documented in [Testing and visual acceptance](./testing.md).
Operational verification and rollback procedures are documented in the [runbook](./runbook.md) and [rollback guide](./rollback.md).
The service-worker cache boundary, HTTPS requirement, and production/Mock isolation are documented in [Progressive Web App](./pwa.md).
