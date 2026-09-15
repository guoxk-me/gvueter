# Deployment

## Build capabilities

<!-- AI modified: one artifact can move between environments because public endpoints are no longer compiled into JavaScript. -->

The history-mode SPA requires Node.js `>=24.18.0 <25` to build. Only capabilities that change emitted files are build-time settings:

```sh
VITE_BASE_PATH=/ \
VITE_ENABLE_MOCKS=false \
VITE_ENABLE_PWA=false \
pnpm run build
```

- `VITE_BASE_PATH` is an absolute URL-safe path ending in `/`; Router, assets, Runtime Config and PWA share it.
- `VITE_ENABLE_MOCKS=true` is only for demos/tests and must not be deployed as production.
- `VITE_ENABLE_PWA=true` emits installable assets and cannot coexist with Mock.
- `VITE_RUNTIME_CONFIG_LEGACY=true` is a one-Minor migration build. It falls back to embedded legacy `VITE_*` values only when Runtime Config is missing/unreadable, never when received JSON is invalid or unsupported.

## Runtime Config

Standard builds fetch `${VITE_BASE_PATH}runtime-config.json` with `no-store` before Vue mounts. The response must be JSON, no larger than 32 KiB, use exactly `schemaVersion: 1`, contain no unknown fields and follow [`public/runtime-config.json`](../public/runtime-config.json).

It configures only public browser values:

- `api.baseUrl`: same-origin absolute path or credential-free HTTPS URL;
- `notifications.url`: credential-free WSS URL or `null`;
- `notifications.allowedOrigins`: exact WSS origins;
- `navigation.externalOrigins` and `navigation.iframeOrigins`: separate exact HTTPS origins.

It does not detect application updates and must never contain secrets, tokens, passwords or private service addresses. A missing, timed-out, oversized, wrong-MIME, malformed or unsupported config blocks application startup and shows a safe retry screen. Static hosts publish the file beside the Base-scoped `index.html` and set `Cache-Control: no-store` plus the normal security headers.

## Reference container

The multi-stage Docker image uses pinned Node and unprivileged Nginx digests. Build once, then provide public configuration at startup:

```sh
docker build \
  --build-arg VCS_REF="$(git rev-parse HEAD)" \
  --build-arg VITE_BASE_PATH=/ \
  --build-arg VITE_ENABLE_MOCKS=false \
  --build-arg VITE_ENABLE_PWA=false \
  -t gvueter-admin:local .

docker run --rm -p 8080:8080 \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -e API_UPSTREAM=http://backend:8080 \
  -e BACKEND_READY_PATH=/health/ready \
  -e PUBLIC_API_BASE_URL=/api \
  -e PUBLIC_NOTIFICATION_URL=wss://admin.example.com/notifications \
  -e PUBLIC_NOTIFICATION_ALLOWED_ORIGINS=wss://admin.example.com \
  -e PUBLIC_EXTERNAL_NAVIGATION_ORIGINS=https://docs.example.com \
  -e PUBLIC_IFRAME_ORIGINS=https://embed.example.com \
  gvueter-admin:local
```

The entrypoint validates every value, generates Runtime Config into tmpfs with pinned `jq`, derives CSP sources and exits with code 64 on invalid input. `API_UPSTREAM` is an internal credential-free HTTP(S) origin without a path. The reference gateway preserves the complete browser `/api/...` path upstream; a gnester-lite adapter must therefore expose the agreed same path. `BACKEND_READY_PATH` is a separate same-origin absolute probe path.

[`compose.yaml`](../compose.yaml) is an optional reference and never bundles a business backend. Set `API_UPSTREAM` to a container-network address. The `smoke` profile exists only for deterministic validation.

The runtime executes as `nginx`, listens on 8080, uses a read-only root filesystem, writes only to explicit `/tmp`, drops all Linux capabilities and enables `no-new-privileges`. Nginx is PID 1 and handles SIGTERM directly.

## Nginx and static-host contract

- `GET /healthz` proves static-process liveness and returns minimal JSON.
- `GET /readyz` probes the configured backend dependency; do not restart a healthy frontend solely for an upstream outage.
- `/api/` preserves Authorization, safe/generated Request ID, forwarding metadata, path and query.
- Access logs use the path without query. Reset-password and SSO callback routes are not logged; SSO is `no-store` and both use `no-referrer`.
- `runtime-config.json`, HTML, manifest and worker revalidate or use no-store/no-cache; fingerprinted `/assets/` are immutable.
- Missing assets return 404. SPA fallback applies only inside the configured Base.
- Every response receives CSP, Permissions Policy, Referrer Policy, content-type protection, frame denial and Request ID.

For a cross-origin API, publish an HTTPS `api.baseUrl`, configure exact backend CORS, and authorize the same origin in deployment CSP. Public Runtime Config cannot broaden CSP on an already-hosted static artifact; the hosting layer must emit matching headers.

## Release and provenance

```sh
pnpm install --frozen-lockfile
pnpm run release:check
```

The release gate covers PWA-off, Base-scoped PWA-on, Mock-only, Legacy and Mock+PWA rejection, then restores a production PWA-off `dist`. Trusted CI adds three-browser Runtime Config recovery, Chromium PWA lifecycle, amd64/arm64 image builds, OCI revision labels, SPDX SBOMs, fixed High/Critical vulnerability scanning, hardened-container smoke and graceful shutdown evidence. Images remain local CI evidence in Phase 2; registry publishing and a multi-architecture manifest belong to the release phase.

See [Testing](./testing.md), [PWA](./pwa.md), [Operations runbook](./runbook.md) and [Rollback](./rollback.md).
