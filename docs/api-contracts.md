# API integration boundary

Status: Planned for gnester-lite; no business endpoint is implemented in this frontend.

The previous Mock OpenAPI document, generated DTOs, and endpoint handlers were removed. `src/lib/http.ts` retains a shared Axios instance. Runtime Config supplies `api.baseUrl`; `configureAccessToken` is an optional credential hook and does not log users in.

gnester-lite is a separate NestJS backend. Inspected local backend routing uses `/api/v1` for versioned controllers and `/api/health/ready` for readiness. Its development environment exposes generated OpenAPI at `/docs-json`. These paths have not been verified by an end-to-end integration run. When real application endpoints are available, derive client contracts from their published schema and add response validation before rendering backend data.

The reference Nginx gateway preserves the complete `/api/...` request path and query. A paired deployment should set `PUBLIC_API_BASE_URL=/api/v1`, `API_UPSTREAM` to the backend origin, and `BACKEND_READY_PATH=/api/health/ready`. Without `API_UPSTREAM`, the frontend is independently ready and API requests receive 503.
