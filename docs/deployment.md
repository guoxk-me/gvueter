# Deployment

Status: Implemented standalone frontend; gnester-lite pairing remains unexecuted.

## Build

The same artifact can move between environments. The only build switches are `VITE_BASE_PATH` and `VITE_ENABLE_PWA`.

```sh
pnpm install --frozen-lockfile
pnpm run build
```

The public `runtime-config.json` uses schema version 2 and contains only `api.baseUrl`. It is fetched with `no-store` before Vue mounts. A missing, invalid, oversized, or wrong-MIME configuration stops startup and shows a retry screen.

## Static hosting

Serve the build at the matching Base path. Publish a valid `runtime-config.json` beside `index.html` with `Cache-Control: no-store`. Keep API routes out of SPA fallback.

## Reference container

```sh
docker build -t gvueter:local .
docker run --rm -p 8080:8080 gvueter:local
```

The container runs unprivileged Nginx on port 8080 with a read-only root filesystem. It generates runtime configuration in tmpfs. Without `API_UPSTREAM`, `/healthz` and `/readyz` report frontend health, while `/api/*` returns 503. Configure a backend only when it exists:

```sh
docker run --rm -p 8080:8080 \
  -e API_UPSTREAM=http://backend:8080 \
  -e PUBLIC_API_BASE_URL=/api/v1 \
  -e BACKEND_READY_PATH=/api/health/ready \
  gvueter:local
```

The gateway forwards the complete API path/query, Authorization, forwarding metadata, and a safe request ID. `/readyz` probes the configured backend when present. The actual gnester-lite integration has not been executed. `compose.yaml` exposes the same options.

The container emits CSP, no-sniff, frame denial, referrer and permissions headers. Runtime configuration contains no credentials. See [Security](./security.md), [Runbook](./runbook.md), and [Rollback](./rollback.md).
