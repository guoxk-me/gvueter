# API and Mock contract

The browser and backend use one transport contract. `src/lib/api-contracts.ts` defines the shared executable Zod schemas, `src/lib/http.ts` always validates the JSON envelope and requires an endpoint `responseSchema` for production requests, and `docs/openapi.yaml` is the integration-facing OpenAPI 3.1 description. TypeScript generics alone are not treated as runtime validation.

The published OpenAPI servers distinguish `/api/v1` for the paired gnester-lite production gateway from `/api` for deterministic MSW. Reverse proxies remove only the gateway `/api` segment; they must not add or remove a second application-version segment.

## gnester-lite integration boundary

<!-- AI modified: the frontend/backend pairing now has one explicit versioned identity contract. -->

The browser-facing path remains same-origin. A Gvueter deployment paired with gnester-lite can publish `/api/v1` in `runtime-config.json`; the reference proxy preserves that complete path upstream, so the backend gateway must expose the same `/api/v1/...` contract. Local MSW continues to use `/api` so its deterministic fixtures do not pretend to be the production Nest application.

Password login, SSO exchange, and `GET /auth/me` return identity and authorization atomically. Login/exchange add token fields around this shared principal payload:

```json
{
  "tenantId": "tenant-demo",
  "user": {
    "id": 1,
    "name": "Administrator",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "createdAt": "2026-07-15T08:30:00Z"
  },
  "authorization": {
    "contractVersion": 1,
    "policyVersion": "policy-42",
    "grants": [
      {
        "permissionIdentifier": "system:monitoring:read",
        "action": "read",
        "subject": "Monitoring"
      }
    ],
    "dataScope": { "scope": "all" }
  }
}
```

`tenantId` is required in every authenticated principal; `null` explicitly denotes an unscoped single-tenant session. A login request may contain a tenant selection hint, but only the backend response establishes tenant ownership, and `/auth/me` corrects stale browser state. `contractVersion` protects structural compatibility; `policyVersion` changes whenever effective grants or data scope change. Stable `permissionIdentifier` values are the backend enforcement/audit vocabulary, while `action` and `subject` are the CASL UX projection. The browser never derives grants from `user.role`. After the active role is edited it reloads `/auth/me`; an absent, stale, or malformed authorization snapshot fails closed.

gnester-lite currently supplies infrastructure and development demos but no production Admin identity/role/menu/audit persistence. Its product module must implement the versioned endpoints and the envelope below before disabling MSW; demo JWT claims or demo controllers are not a production compatibility layer. No database schema is implied or auto-created by this frontend contract.

The contract gate compares the complete 79-operation Mock inventory with OpenAPI in both directions. All JSON mutation request bodies resolve to closed domain DTOs (`additionalProperties: false`), all 29 Mock JSON readers require an executable schema, and all 75 production request call sites require an executable response schema. Binary uploads and downloads are checked separately for exact media types and download headers.

<!-- AI modified: generated transport types and the owned migration backlog now share one drift gate. -->

## Generated DTO workflow

`pnpm run api:generate` regenerates `src/types/openapi-generated.ts` from `docs/openapi.yaml`; the generated file is committed and must not be edited by hand. `pnpm run api:check` performs an in-memory regeneration and also validates `docs/product/api-binding-plan.json`, so every OpenAPI operation is either bound to generated transport types or assigned to an owner, Issue and target phase. The current core binds 21 authentication, user, role and managed-menu operations; 58 non-core operations remain explicit follow-up work rather than being presented as completed migration.

Generated DTOs describe wire input and boundary-validated response data. Raw form values, display projections and table state remain local types. Zod still strips or rejects untrusted fields at runtime, including menu submission cleanup; TypeScript generation does not replace runtime validation.

## SSO handoff

SSO is a separate backend-owned authentication channel; `/auth/login` remains password-only. The login page reads the safe `GET /auth/sso/config` projection, then `POST /auth/sso/start` creates a transaction and returns an authorization URL generated from trusted provider configuration. The browser validates its basic URL boundary before a full-page navigation. Production owns OAuth/OIDC discovery, exact redirect URI matching, state, nonce, PKCE, provider callback, account mapping, tenant membership, and client secrets.

After the backend callback succeeds, the SPA receives only a short-lived, single-use application ticket in the `/sso/callback#ticket=...` fragment. The callback page captures and removes the fragment before calling `POST /auth/sso/exchange`. Exchange atomically consumes the ticket and returns the existing opaque application token, backend-selected user/tenant, and a previously validated internal redirect path. Access tokens, identity-provider codes, client secrets, claims, and arbitrary provider error descriptions never belong in the route.

## Envelope and errors

Every JSON response contains all three fields:

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code` is `0`, `200`, `OK`, or `SUCCESS` for success; failures use a stable business code.
- `message` is safe user-facing text. It must not contain stack traces, SQL, tokens, or internal host names.
- `data` is always present. Use `null` for an intentional empty scalar result, `[]` for an empty collection, and omit optional object properties instead of mixing missing properties with `null`.
- Failure details may contain `fieldErrors`, `retryAfterSeconds`, and non-sensitive extension values.
- A field error is either one non-empty string or a non-empty bounded string array; clients must accept both forms.
- The server returns `X-Request-ID`; the client sends its own UUID when no upstream trace exists. `ApiError.requestId` prefers the server value and exposes it to shared error UI and support workflows.
- Generic JSON values are limited to depth 40, 50,000 aggregate nodes, and 1,000,000 characters per string before feature state can consume them.

`ApiError.category` and `ApiError.nextAction` provide a stable recovery contract:

| Status or condition                         | Category                         | Next action       |
| ------------------------------------------- | -------------------------------- | ----------------- |
| canceled request                            | `canceled`                       | `none`            |
| 401                                         | `authentication`                 | `sign-in`         |
| ordinary authorization 403                  | `authorization`                  | `request-access`  |
| terminal identity code (including HTTP 403) | `authentication`                 | `sign-in`         |
| 409                                         | `conflict`                       | `refresh`         |
| 422                                         | `validation`                     | `review-input`    |
| timeout/network/5xx                         | `timeout` / `network` / `server` | `retry`           |
| malformed envelope                          | `contract`                       | `contact-support` |

The UI can translate the recovery action, but it must preserve the business message and request ID for diagnosis. A `401` invalidates the JavaScript session. An ordinary authorization `403` preserves it; an explicit terminal identity code such as `ACCOUNT_SUSPENDED`, `ACCOUNT_DISABLED`, or `SESSION_REVOKED` invalidates it while retaining HTTP 403 for transport diagnostics. This template has no browser refresh-token surface—production renewal belongs to a backend-owned `HttpOnly` cookie contract.

## Pagination, sorting, and filtering

- Network pages are one-based: `page >= 1`.
- Vue/TanStack state remains zero-based internally; shared table adapters perform the conversion exactly once.
- `pageSize` is an integer from 1 through 200. Individual endpoints may publish a smaller allow-list.
- A page response contains `items`, `total`, `page`, and `pageSize`.
- A response contains at most 200 items; `items.length` cannot exceed either `pageSize` or `total`.
- Sorting uses a registered `sortField` and `asc` or `desc`. Backends must reject unknown sort fields instead of interpolating them into a query.
- Filter values are endpoint-specific and must be schema-validated. Empty strings are not aliases for `null` unless the endpoint explicitly documents that behavior.

## Dates, time zones, and files

- API date-times use ISO 8601 with an explicit `Z` or numeric offset, for example `2026-07-15T08:30:00+08:00`.
- Business time zones use `UTC` or an IANA identifier such as `Asia/Shanghai`; browser-local time is never an implicit persistence value.
- Display formatting remains locale-aware through `Intl.*`, while API values remain machine-readable.
- Upload receipts contain a server-owned `fileId`, safe display name, content type, byte size, and offset-bearing timestamp.
- Browser MIME, extension, size, and file name are hints only. The backend repeats content inspection, authorization, storage naming, and download-header enforcement.

## Upload configuration and runtime policy

<!-- AI modified: the administrative upload settings now have an explicit safe runtime projection consumed by upload workflows. -->

`GET /uploads/policy` is authenticated but does not require Settings access. Its strict response data contains only `maxFileSizeBytes`, a unique canonical lower-case `allowedExtensions` array, and `updatedAt`; both it and `GET`/`PUT /system-config` return `Cache-Control: no-store`. The policy projection deliberately excludes provider, endpoint, region, bucket, object-key prefix, public base URL, access-key ID, and secrets.

`PUT /system-config` always carries every upload field. For `local`, object-storage strings may be empty because the filesystem root remains deployment-owned backend configuration. For `s3`, endpoint URL, region, bucket, and access-key ID are required; the endpoint must be an absolute HTTP(S) URL without embedded credentials, the bucket follows the bounded S3 naming contract, and the object-key prefix must be relative and traversal-free. An empty `accessKeySecret` retains the currently stored value and is valid only when a secret already exists. Responses reconstruct the explicit typed configuration and expose `accessKeySecretMask` instead of the credential.

The global policy is a ceiling, not a capability grant. Each upload service intersects it with its own authorization, extension/MIME/signature checks, byte limit, and infrastructure limit:

- Content files remain restricted to the published content types and 5 MiB.
- User import additionally requires `csv` in the global allow-list and remains restricted to UTF-8 CSV, 256 KiB, the fixed schema, and 200 data rows.
- Component-gallery upload examples are deterministic UI demonstrations, not production storage-policy consumers.

## Deterministic Mock scenarios

MSW exposes contract fixtures under `/api/contract-scenarios`:

- `/delay` returns a delayed success.
- `/timeout` exceeds a deliberately small test-client timeout.
- `/failures/unauthorized`, `/forbidden`, `/conflict`, `/validation`, and `/server-error` return 401, 403, 409, 422, and 500 envelopes with request IDs.

These endpoints exist only in local/demo MSW. Contract tests assert the status, business code, error category, recovery action, details, and trace ID; production services must implement equivalent integration tests against their generated schema.

Mutable Mock collections and retained binary payloads also have explicit capacity ceilings. Capacity failures return typed 409 or 413 envelopes instead of allowing an in-browser demo session to grow without bound.

<!-- AI modified: executable request/response gates now close every JSON boundary represented by the complete Mock inventory. -->
