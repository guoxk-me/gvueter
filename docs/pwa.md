# Progressive Web App

<!-- AI modified: PWA is a build capability, independent from public deployment configuration. -->

Gvueter is PWA-off by default. Set `VITE_ENABLE_PWA=true` only for a production build that should be installable. `VITE_ENABLE_MOCKS=true` and PWA cannot coexist; the build fails before emitting an ambiguous worker graph.

## User experience

- Supported browsers can expose the in-app install action after `beforeinstallprompt`.
- A waiting worker presents an explicit update action and warns users to save unfinished edits before reload.
- Offline readiness means the static shell is available; authenticated business data still requires the server.
- Browsers without Service Worker support run the normal web application without an install entry.

## Worker and cache boundary

The worker is emitted as `pwa-sw.js` under the configured `VITE_BASE_PATH`. Its scope, manifest `scope`/`start_url`, routes and assets share that same Base.

- Only versioned frontend assets, fonts, icons, HTML and the SPA shell are precached.
- API, authentication, OAuth/OIDC/SSO, login, reset-password and Mock worker requests are network-only or excluded from navigation fallback.
- Owned caches use `gvueter-pwa` or `gvueter-pwa-*`; cleanup never removes another application's caches.
- PWA-off and Mock modes remove an owned prior PWA worker and caches within a five-second budget. A current-tab session guard permits at most one migration reload.
- PWA-on removes a conflicting same-scope MSW worker before mounting, then registers asynchronously after the Vue shell is usable.

## Verification

```sh
VITE_ENABLE_MOCKS=false VITE_ENABLE_PWA=false pnpm run build
VITE_BASE_PATH=/admin/ VITE_ENABLE_MOCKS=false VITE_ENABLE_PWA=true pnpm run build
CI=true pnpm run test:e2e:pwa
VITE_ENABLE_MOCKS=true VITE_ENABLE_PWA=false pnpm run build
```

The artifact gate proves PWA-off and Mock builds contain no worker/manifest, while PWA-on contains the Base-scoped manifest, generated install icons, owned cache namespace and network-only rules. Chromium validates registration and cache contents. The release matrix still verifies ordinary flows in Chromium, Firefox and WebKit; Safari/Firefox install UX remains an explicit deployment-browser sample.

Deploy PWA builds behind HTTPS. Serve `pwa-sw.js`, `manifest.webmanifest` and HTML with revalidation/no-cache behavior while fingerprinted assets may be immutable. A rollback must retain old hashed assets long enough for installed clients and must never deploy a Mock-enabled artifact.
