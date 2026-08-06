# Progressive Web App

<!-- AI modified: this policy documents the production PWA boundary and prevents offline support from becoming an authentication cache. -->

Gvueter emits an installable PWA only for production builds where `VITE_ENABLE_MOCKS` is not
`true`. Mock builds use MSW's root-scoped worker and deliberately emit neither
`manifest.webmanifest` nor `pwa-sw.js`.

## User experience

- Supported browsers can offer an in-app install action after `beforeinstallprompt`.
- A waiting service worker presents an explicit update action. Updating reloads the page, so the
  prompt reminds administrators to save unfinished edits first.
- Once the static application shell is available offline, a toast explains that business data still
  requires the server.
- The existing global network banner remains the source of truth for current connectivity.

## Cache boundary

The service worker precaches only versioned frontend assets, fonts, icons, HTML, and the SPA shell.
It does not provide an API response cache or an offline mutation queue.

- `/api`, authentication, OIDC, OAuth, SSO, login, password reset, and MSW worker requests are
  network-only or excluded from navigation fallback.
- `mockServiceWorker.js` is excluded from precache.
- PWA caches use the `gvueter-pwa` namespace. Switching to Mock/development mode unregisters the PWA
  worker and removes only those owned caches.
- Switching to production unregisters a stale MSW worker before PWA registration. If the conflicting
  worker controls the current document, the application reloads once after unregistering it.

## Build verification

Run the production and Mock artifact gates from the repository root:

```sh
VITE_ENABLE_MOCKS=false vp run build
VITE_ENABLE_MOCKS=true vp run build
```

The build runs `scripts/check-pwa-artifact.mjs`. Production must contain a standalone web manifest,
192/512/maskable icons, a service worker, the Gvueter cache namespace, and explicit network-only
routes. Mock output must not contain PWA registration artifacts.

Deploy behind HTTPS. The edge should serve `pwa-sw.js` without immutable caching and may cache hashed
assets immutably; see [Deployment](./deployment.md) for the broader header policy.
