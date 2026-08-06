# Frontend security contract

The browser is an untrusted client. CASL, route guards, hidden menus and `PermissionGate` improve UX only. **A hidden button is not authorization.** Every protected API must authenticate, authorize and apply data scope again on the backend.

## Implemented in this template

### Authentication

- Password login requires a one-time captcha. A failed attempt consumes the challenge.
- Unknown accounts and wrong passwords both return `401 / INVALID_CREDENTIALS` with the same public message.
- Forgot-password returns the same success envelope for known and unknown addresses. A reset token is created only for a known account.
- The MSW login handler locks a canonical email key after five failures for 30 seconds and returns `429` with `Retry-After`. An expired lock starts a new failure window.
- Change-password verifies the current password, rejects reuse, and repeats the strong-password check in the handler. Reset-password repeats the strong-password check and consumes a time-limited token once.
- A reset token accepted from the route is removed from the visible route after the page captures it. Production delivery should prefer a fragment or one-time exchange and must redact reset paths from access logs.
- SSO first creates a transaction through the same-origin backend start endpoint, then performs a full-page navigation to the backend-generated HTTPS provider URL. The SPA never receives an identity-provider authorization code, state, nonce, PKCE verifier, client secret, or provider token.
- The SSO callback captures a short-lived application ticket from the fragment, removes it before exchange, and atomically exchanges it once. The system-configuration toggle controls both the public login option and backend start behavior.
- SSO exchange is a public identity-entry request: it never carries an unrelated bearer token and its failure cannot invalidate an active principal. An existing session wins over a stale callback instead of being silently replaced.

The MSW session and short-lived SSO ticket registries use tab-scoped `sessionStorage` so the redirect demo can survive a browser reload. They are client-readable and client-modifiable and therefore prove only frontend integration, never backend-wide session revocation, transaction binding, or replay protection. A real backend must own durable sessions, SSO transactions, atomic ticket consumption, shared rate-limit state, identity-provider verification, account mapping, tenant membership, password hashing, revocation, and authentication audit events.

### Authorization and sensitive data

- Mock Settings management reads require `read Settings`; Content reads require `read Content`. Writes keep their server-side authorization checks.
- Shared dictionary option lookup remains available to any authenticated workflow; dictionary management endpoints require Settings permission.
- User-list data scope is applied before filtering and pagination. Broad read-only lists mask email unless the active permission allows the full value.
- Role-policy access uses its own `RolePolicy` subject. Creating or editing a user does not grant role-assignment authority; non-privileged imports can only create viewer accounts.
- System configuration responses reconstruct an explicit typed object, return masks instead of stored secrets, and are marked `Cache-Control: no-store`.
- Operation-log responses reconstruct an explicit allow-list and expose masked email/IP fields only.
- `401` invalidates the local session. An ordinary authorization `403` preserves it and reports forbidden access, while explicit terminal account/session codes such as `ACCOUNT_SUSPENDED` invalidate it without changing the transport status.

The real backend must derive permissions and tenant/data scope from its authenticated principal. It must not trust role names, CASL rules, IDs, hidden controls, or request fields supplied by this app.

### Output and rich content

- Vue interpolation or typed VNodes are used for user-controlled display text. There is no application `v-html` rendering path.
- Markdown preview renders a bounded typed tree for headings, paragraphs, lists, quotes, emphasis, links, images and code. Raw HTML stays text; executable protocols are rejected; external images require an explicit HTTPS-origin allow-list.
- `RichTextEditor` allows only `a`, `blockquote`, `br`, `code`, `em`, `h1`–`h3`, `img`, `li`, `ol`, `p`, `pre`, `s`, `span`, `strong`, `u` and `ul`. It preserves only audited Quill alignment/code/indent classes; link `href`/`rel`/`target` and image `src`/`alt`/`loading` are regenerated from policy. All other attributes, event handlers and unsafe protocols are removed. External images require an explicit HTTPS-origin allow-list.
- Client sanitation protects editing and preview surfaces only. Storage APIs must apply the same or a stricter parser-based allow-list after receiving content and before persistence, and delivery APIs must return only sanitized HTML. A backend must not trust HTML merely because the browser emitted it.
- Production Nginx sends CSP with `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, same-origin frames, and `frame-ancestors 'none'`. It also sends `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and legacy `X-Frame-Options`.

### Uploads and downloads

<!-- AI modified: upload settings are projected through a separate least-privilege runtime policy instead of exposing storage configuration. -->

- Authenticated upload workflows read `GET /uploads/policy`, whose strict no-store response contains only the global byte ceiling, canonical lower-case extension allow-list, and update time. It never exposes provider, endpoint, region, bucket, path prefix, public URL, access-key ID, or secret.
- The browser continues to upload through authenticated same-origin application endpoints. Ordinary upload workflows receive neither the S3 access-key ID nor secret; the Settings projection may show the configured ID and a secret mask for administration, but never the raw secret or a usable AK/SK pair, and it does not use either value for storage calls. A production backend must validate any configurable S3 endpoint against its network/allow-list policy before connecting so an administrator cannot turn it into an SSRF path.
- Global upload settings only narrow an endpoint's business and platform policy. Content uploads remain bounded by their 5 MiB/type/signature checks, while user import additionally requires the global `csv` extension and remains bounded to 256 KiB, UTF-8, the fixed schema, and 200 data rows.
- `FileUpload` applies count, byte-size, duplicate and browser `accept` checks before updating the model.
- Callers can provide independent extension and MIME allow-lists; both must pass when configured. `ImageUpload` accepts only PNG, JPEG and WebP extensions and MIME types.
- Upload names reject path separators, control characters, trailing dot/space, empty names, and names over 180 characters. Binary-upload and download names are stripped to a safe final segment again in the request layer.
- Content administration sends and stores the original validated bytes; preview/download tests compare the returned payload instead of accepting metadata-only placeholders.
- The component-center lifecycle demo transfers acknowledged chunks and keeps waiting, uploading, paused, failed, canceled and succeeded state separate from local file selection. Its in-memory Mock receipts demonstrate pause/resume/retry only; production resumable uploads require authenticated, expiring upload sessions and server-owned chunk integrity checks.
- The demo uses 64 KiB chunks only to make progress observable. The production recommendation is object-storage multipart above 10 MiB, provider-compatible chunks of at least 5 MiB, per-chunk digests, an expiring resumable session and explicit abort cleanup. Local duplicate detection by name/size/modified time is UX-only; authoritative deduplication must use a server digest within the authenticated tenant and retention scope.
- The MSW backend checks common PNG/JPEG/WebP/PDF signatures and rejects NUL-containing text after extension, MIME and size checks.
- User CSV import accepts only UTF-8 CSV bytes with a fixed schema, size and row limits; it detects duplicates, invalid values and spreadsheet-formula prefixes, while CSV export neutralizes formula prefixes again.

Browser MIME, extension and filename values are attacker-controlled metadata. The backend must repeat size and allow-list checks, inspect file signatures, generate storage names, isolate or scan active content, and set safe download headers.

### Mutations and audit

- Forms and dialogs disable their initiating control while a mutation is pending; authentication and password flows also check pending state in their submit handler.
- Destructive actions use confirmation UI. These controls reduce accidental duplicates but are not transaction integrity.
- The request layer does not invent a universal idempotency key. Financial, irreversible, import and other retry-sensitive APIs must define a backend idempotency contract and persist the key/result atomically.
- Successful user, role-policy, announcement, file and grouped-configuration mutations feed one masked in-memory operation-log source used by both the log page and Dashboard. This demonstrates event ownership but is not a durable audit trail.

The backend must emit tamper-resistant login and operation events for authentication, permission changes, destructive mutations, imports, exports and configuration changes. Recommended fields are actor, tenant, action, resource, outcome, timestamp, request/correlation ID, and appropriately masked network context.

## Navigation and embedding boundary

- Backend menu component and icon keys resolve through fixed frontend registries; values never become import paths.
- Internal routes require path, route name, and a registered component together (or none of them for a grouping node). External links carry only a target URL. Iframes require path, route name, the fixed `iframe` component key, and a target URL. The editor and Mock API reject conflicting fields with a field-locatable `422` response.
- Cross-origin external/iframe URLs require an exact HTTPS origin from `VITE_NAVIGATION_ALLOWED_ORIGINS`; subdomains and non-default ports are separate origins. Configuration paths and trailing slashes are reduced to the origin, while a target URL may retain its query and hash. Same-origin HTTP(S) paths are accepted and URL credentials are rejected.
- External links use real anchors with a new-window cue and `noopener noreferrer`.
- The shipped production CSP permits only same-origin frames. Any cross-origin iframe deployment requires an explicit backend origin allow-list and matching CSP; frontend URL checks alone are insufficient.
- Iframes run in a sandbox without `allow-same-origin`. The embedded document must still be treated as untrusted content.
- Client validation covers the submitted URL, not an eventual redirect destination. The backend must enforce redirect/origin policy; iframe CSP and the loading timeout remain the browser-side recovery boundary.

## Backend-only guarantees

The frontend cannot guarantee token signature validation, cookie flags, password hashing/history, distributed rate limiting, session revocation, tenant isolation, row-level authorization, idempotent transactions, file signature/virus inspection, CSP delivery by every edge, or durable audit logs. Production acceptance must verify these controls at the API, identity provider, storage service and reverse proxy—not by inspecting the UI.
