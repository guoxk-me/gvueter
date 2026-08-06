# Frontend observability

`src/lib/observability.ts` installs the application-wide Vue and unhandled-Promise capture before plugins and routing are mounted. `src/lib/application-recovery.ts` adds the user-visible boundary for fatal Vue rendering, router navigation, Vite asset-preload, and bootstrap failures.

Each record contains only a bounded source, error name/message/stack, component name, Vue lifecycle context, and timestamp. Component props/state, request bodies, tokens, cookies, DOM content, and arbitrary user objects are deliberately excluded. A production reporter must apply an additional organization-specific redaction policy before transport.

## Reporter integration

Monitoring vendors can register an adapter without changing application bootstrap:

```ts
const unregister = registerFrontendErrorReporter('production-monitoring', {
  report: async (record) => monitoringClient.capture(record),
})
```

The browser also dispatches an `admin:frontend-error` `CustomEvent`, which supports a runtime integration loaded by the deployment shell. Reporter failures are isolated and never replace the original application failure. Cleanup functions unregister adapters and event listeners for tests or micro-frontend teardown.

HTTP failures use the separate `ApiError` contract. They include a stable category, recovery hint, and request ID. Error views should show the request ID, provide the matching next action, and keep detailed payloads out of telemetry.

## Fatal application recovery

<!-- AI modified: fatal recovery has one privacy-safe state and one manual action across failure sources. -->

The visible recovery state stores only a failure kind, timestamp, and optional static route name. It never stores or renders the original `Error`, stack, full URL, query, hash, component state, or request payload. The first fatal failure owns the screen so a derived router error cannot replace the more useful Vite preload classification.

Vue descendant errors are reported once by `ApplicationErrorBoundary`, which then stops propagation because it already owns a visible recovery state. The global Vue handler remains the fallback for errors outside that descendant tree. A canceled `vite:preloadError`, an otherwise uncaught router navigation error, and a caught bootstrap rejection report through the same redacted reporter contract. The same `Error` object is reported once if Vite and Vue Router both observe it.

Recovery is deliberately manual. The screen offers **Reload application** and warns about unsaved changes; it never enters an automatic refresh loop. Ordinary query errors and background Promise failures remain local/telemetry-only because they do not prove that the whole interface is unusable. If Vue cannot mount, bootstrap renders an equivalent native-DOM fallback without depending on Router, Pinia, or i18n.

## Operational ownership

- Frontend capture covers Vue rendering/setup errors, unhandled Promise rejections, failed navigation, Vite asset preloads, and bootstrap.
- The existing monitoring workspace demonstrates login, operation, API, exception, job, service, session, and cache records.
- Permission and role mutations feed the operation-log boundary; production backends must persist immutable actor, tenant, action, resource, outcome, timestamp, request ID, and masked network context.
- Network, CSP, edge, backend, database, and worker failures remain server/platform telemetry responsibilities.
- A deployment must configure sampling, retention, release identifiers, source maps, data residency, and alert routing before calling the integration production-ready.

<!-- AI modified: observability remains vendor-neutral while defining capture, privacy, cleanup, and backend ownership. -->
