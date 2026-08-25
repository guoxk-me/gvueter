import { setupWorker } from 'msw/browser'
import { reportUnhandledBrowserRequest } from './browser-request-boundary'
import { handlers } from './handlers'

const MOCK_SERVICE_WORKER_URL = '/mockServiceWorker.js'

export const worker = setupWorker(...handlers)

function isMockWorkerRegistration(
  registration: ServiceWorkerRegistration,
  absoluteWorkerUrl: string,
): boolean {
  return [registration.active, registration.installing, registration.waiting].some(
    registeredWorker => registeredWorker?.scriptURL === absoluteWorkerUrl,
  )
}

async function discardUncontrolledMockRegistrations(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator))
    return

  const absoluteWorkerUrl = new URL(MOCK_SERVICE_WORKER_URL, window.location.href).href
  const controller = navigator.serviceWorker.controller
  if (controller?.scriptURL === absoluteWorkerUrl && controller.state !== 'redundant')
    return

  const registrations = await navigator.serviceWorker.getRegistrations()
  const mockRegistrations = registrations.filter(registration =>
    isMockWorkerRegistration(registration, absoluteWorkerUrl),
  )

  // AI modified: Firefox may retain MSW's self-unregistered record across reload and otherwise loop.
  await Promise.all(
    mockRegistrations.map(async (registration) => {
      try {
        await registration.unregister()
      }
      catch {
        // A concurrently removed registration is already in the desired state.
      }
    }),
  )
}

export async function startBrowserMocking(): Promise<void> {
  await discardUncontrolledMockRegistrations()
  await worker.start({
    // AI modified: strictness belongs to the owned API namespace, not Vite or browser assets.
    onUnhandledRequest: (request, print) =>
      reportUnhandledBrowserRequest(request, print, window.location.origin),
    serviceWorker: {
      url: MOCK_SERVICE_WORKER_URL,
      options: {
        updateViaCache: 'none',
      },
    },
  })
}
