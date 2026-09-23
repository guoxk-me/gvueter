/// <reference lib="webworker" />

import { setCacheNameDetails } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string, revision: string | null }> }

const applicationBasePath = new URL(self.registration.scope).pathname

setCacheNameDetails({ prefix: 'gvueter-pwa' })
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING')
    void self.skipWaiting()
})

// AI modified: deployment configuration and API responses always use the network.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') || url.pathname.endsWith('/runtime-config.json'),
  new NetworkOnly(),
)

registerRoute(new NavigationRoute(createHandlerBoundToURL(`${applicationBasePath}index.html`), {
  allowlist: [new RegExp(`^${applicationBasePath}`)],
}))
