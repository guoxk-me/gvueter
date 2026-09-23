# Operations runbook

Status: Implemented reference behavior.

1. Verify `GET /healthz`. It reports the Nginx process.
2. Verify `GET /readyz`. Without `API_UPSTREAM` it reports the standalone frontend; with a backend it probes `BACKEND_READY_PATH`.
3. Fetch `runtime-config.json` and verify schema version 2, JSON MIME, and `Cache-Control: no-store`.
4. If startup shows configuration recovery, fix `PUBLIC_API_BASE_URL` or the static-host JSON and use the retry action.
5. If backend calls fail, verify `API_UPSTREAM`, `PUBLIC_API_BASE_URL`, the backend path, and request IDs. The frontend has no login flow to diagnose yet.

See [Deployment](./deployment.md) for environment settings and [Rollback](./rollback.md) for recovery.
