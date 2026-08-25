export const PWA_WORKER_FILENAME = 'pwa-sw.js'
export const MOCK_WORKER_FILENAME = 'mockServiceWorker.js'
export const PWA_CACHE_ID = 'gvueter-pwa'
const PWA_WORKER_FILENAMES = new Set([PWA_WORKER_FILENAME])

export type ServiceWorkerMode = 'mock' | 'none' | 'pwa'

interface WorkerBoundaryEnvironment {
  cacheStorage?: Pick<CacheStorage, 'delete' | 'keys'>
  serviceWorker?: Pick<ServiceWorkerContainer, 'controller' | 'getRegistrations'>
}

function getWorkerFilename(worker: ServiceWorker | null): string | undefined {
  if (!worker)
    return undefined

  try {
    const pathSegments = new URL(worker.scriptURL).pathname.split('/')
    return pathSegments[pathSegments.length - 1]
  }
  catch {
    return undefined
  }
}

function registrationUsesWorker(
  registration: ServiceWorkerRegistration,
  workerFilenames: ReadonlySet<string>,
): boolean {
  return [registration.active, registration.installing, registration.waiting].some((worker) => {
    const workerFilename = getWorkerFilename(worker)
    return workerFilename !== undefined && workerFilenames.has(workerFilename)
  })
}

export function isPwaWorkerRegistration(registration: ServiceWorkerRegistration): boolean {
  // AI modified: registrations are scope-based, so verify the actual script before scheduling updates.
  return registrationUsesWorker(registration, PWA_WORKER_FILENAMES)
}

function getDefaultEnvironment(): WorkerBoundaryEnvironment {
  if (typeof navigator === 'undefined')
    return {}

  return {
    cacheStorage: typeof caches === 'undefined' ? undefined : caches,
    serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  }
}

export async function reconcileServiceWorkerMode(
  mode: ServiceWorkerMode,
  environment: WorkerBoundaryEnvironment = getDefaultEnvironment(),
): Promise<boolean> {
  const conflictingWorkerFilenames = new Set<string>()
  if (mode !== 'pwa')
    conflictingWorkerFilenames.add(PWA_WORKER_FILENAME)
  if (mode !== 'mock')
    conflictingWorkerFilenames.add(MOCK_WORKER_FILENAME)

  let shouldReload = false
  const serviceWorker = environment.serviceWorker
  if (serviceWorker && conflictingWorkerFilenames.size > 0) {
    const controllerFilename = getWorkerFilename(serviceWorker.controller)
    // AI modified: restricted browser storage must not turn optional worker cleanup into a bootstrap failure.
    const registrations = await serviceWorker.getRegistrations().catch(() => [])
    const conflictingRegistrations = registrations.filter(registration =>
      registrationUsesWorker(registration, conflictingWorkerFilenames),
    )

    // AI modified: root-scoped MSW and PWA workers are mutually exclusive, so remove the inactive mode first.
    const removalResults = await Promise.all(
      conflictingRegistrations.map(registration => registration.unregister().catch(() => false)),
    )
    shouldReload
      = controllerFilename !== undefined
        && conflictingWorkerFilenames.has(controllerFilename)
        && removalResults.some(Boolean)
  }

  if (mode !== 'pwa' && environment.cacheStorage) {
    const cacheNames = await environment.cacheStorage.keys().catch(() => [])
    // AI modified: Mock and development modes discard only Gvueter-owned offline caches.
    await Promise.all(
      cacheNames
        .filter(cacheName => cacheName.includes(PWA_CACHE_ID))
        .map(cacheName => environment.cacheStorage?.delete(cacheName).catch(() => false)),
    )
  }

  return shouldReload
}
