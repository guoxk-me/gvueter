/// <reference lib="webworker" />

import { setCacheNameDetails } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string, revision: string | null }> }

const applicationBasePath = new URL(self.registration.scope).pathname
const networkOnlyPaths = /^\/(?:api|auth|oauth|oidc|sso)(?:\/|$)/
const privateNavigationPaths = new RegExp(
  `^${applicationBasePath}(?:auth|oauth|oidc|sso|login|forgot-password|reset-password)(?:/|$)`,
)

// AI modified: synchronous Workbox registration makes install-time precaching observable and Base-scoped.
setCacheNameDetails({ prefix: 'gvueter-pwa' })
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING')
    void self.skipWaiting()
})

registerRoute(
  ({ url }) => networkOnlyPaths.test(url.pathname) || url.pathname.endsWith('/mockServiceWorker.js'),
  new NetworkOnly(),
)

// AI modified: only public Base-scoped navigations reuse the static shell offline.
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${applicationBasePath}index.html`), {
  allowlist: [new RegExp(`^${applicationBasePath}`)],
  denylist: [privateNavigationPaths, /\/mockServiceWorker\.js$/],
}))
