export const PWA_WORKER_FILENAME = 'pwa-sw.js'
const LEGACY_WORKER_FILENAME = 'mockServiceWorker.js'
export const PWA_CACHE_ID = 'gvueter-pwa'
export const PWA_RELOAD_GUARD_KEY = 'gvueter:pwa-worker-cleanup-reload'
const PWA_CLEANUP_TIMEOUT_MS = 5_000
const PWA_WORKER_FILENAMES = new Set([PWA_WORKER_FILENAME])

export type ServiceWorkerMode = 'none' | 'pwa'

interface WorkerBoundaryEnvironment {
  basePath?: string
  cacheStorage?: Pick<CacheStorage, 'delete' | 'keys'>
  origin?: string
  sessionStorage?: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
  serviceWorker?: Pick<ServiceWorkerContainer, 'controller' | 'getRegistrations'>
  timeoutMs?: number
}

interface WorkerOwnership {
  basePath: string
  origin: string
}

export class PwaWorkerBoundaryError extends Error {
  constructor(public readonly code: 'PWA_CLEANUP_FAILED' | 'PWA_CLEANUP_TIMEOUT') {
    super(code)
    this.name = 'PwaWorkerBoundaryError'
  }
}

function getNormalizedBasePath(basePath: string): string {
  const path = basePath.startsWith('/') ? basePath : `/${basePath}`
  return path.endsWith('/') ? path : `${path}/`
}

function getWorkerOwnership(
  environment: Pick<WorkerBoundaryEnvironment, 'basePath' | 'origin'>,
): WorkerOwnership {
  return {
    basePath: getNormalizedBasePath(environment.basePath ?? import.meta.env.BASE_URL),
    origin: environment.origin
      ?? (typeof window === 'undefined' ? 'http://localhost' : window.location.origin),
  }
}

function getWorkerFilename(
  worker: ServiceWorker | null,
  ownership: WorkerOwnership,
): string | undefined {
  if (!worker)
    return undefined

  try {
    const workerUrl = new URL(worker.scriptURL)
    if (workerUrl.origin !== ownership.origin || !workerUrl.pathname.startsWith(ownership.basePath))
      return undefined
    const pathSegments = workerUrl.pathname.split('/')
    return pathSegments[pathSegments.length - 1]
  }
  catch {
    return undefined
  }
}

function registrationUsesWorker(
  registration: ServiceWorkerRegistration,
  workerFilenames: ReadonlySet<string>,
  ownership: WorkerOwnership,
): boolean {
  try {
    const scopeUrl = new URL(registration.scope)
    if (scopeUrl.origin !== ownership.origin || !scopeUrl.pathname.startsWith(ownership.basePath))
      return false
  }
  catch {
    return false
  }

  return [registration.active, registration.installing, registration.waiting].some((worker) => {
    const workerFilename = getWorkerFilename(worker, ownership)
    return workerFilename !== undefined && workerFilenames.has(workerFilename)
  })
}

export function isPwaWorkerRegistration(
  registration: ServiceWorkerRegistration,
  environment: Pick<WorkerBoundaryEnvironment, 'basePath' | 'origin'> = {},
): boolean {
  // AI modified: update checks accept only same-origin workers inside the current application Base.
  return registrationUsesWorker(
    registration,
    PWA_WORKER_FILENAMES,
    getWorkerOwnership(environment),
  )
}

function getDefaultEnvironment(): WorkerBoundaryEnvironment {
  if (typeof navigator === 'undefined')
    return {}

  return {
    basePath: import.meta.env.BASE_URL,
    cacheStorage: typeof caches === 'undefined' ? undefined : caches,
    origin: window.location.origin,
    sessionStorage: window.sessionStorage,
    serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  }
}

function isOwnedCache(cacheName: string): boolean {
  return cacheName === PWA_CACHE_ID || cacheName.startsWith(`${PWA_CACHE_ID}-`)
}

function getReloadDecision(
  shouldReload: boolean,
  storage: WorkerBoundaryEnvironment['sessionStorage'],
): boolean {
  if (!shouldReload) {
    try {
      storage?.removeItem(PWA_RELOAD_GUARD_KEY)
    }
    catch {
      // Restricted storage still permits the application to continue without refreshing.
    }
    return false
  }

  try {
    if (!storage || storage.getItem(PWA_RELOAD_GUARD_KEY) === '1')
      return false
    storage.setItem(PWA_RELOAD_GUARD_KEY, '1')
    return true
  }
  catch {
    return false
  }
}

async function completeWithinCleanupBudget<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: number | undefined
  const timeoutFailure = new Promise<never>((_resolve, reject) => {
    timeout = window.setTimeout(
      () => reject(new PwaWorkerBoundaryError('PWA_CLEANUP_TIMEOUT')),
      timeoutMs,
    )
  })

  try {
    return await Promise.race([task, timeoutFailure])
  }
  finally {
    if (timeout !== undefined)
      window.clearTimeout(timeout)
  }
}

async function reconcileOwnedWorkers(
  mode: ServiceWorkerMode,
  environment: WorkerBoundaryEnvironment,
): Promise<boolean> {
  const ownership = getWorkerOwnership(environment)
  const conflictingWorkerFilenames = new Set<string>()
  if (mode !== 'pwa')
    conflictingWorkerFilenames.add(PWA_WORKER_FILENAME)
  // AI modified: retire an old worker without retaining the removed Mock runtime.
  conflictingWorkerFilenames.add(LEGACY_WORKER_FILENAME)

  let shouldReload = false
  const serviceWorker = environment.serviceWorker
  if (serviceWorker && conflictingWorkerFilenames.size > 0) {
    const controllerFilename = getWorkerFilename(serviceWorker.controller, ownership)
    const registrations = await serviceWorker.getRegistrations()
    const conflictingRegistrations = registrations.filter(registration =>
      registrationUsesWorker(registration, conflictingWorkerFilenames, ownership),
    )
    const removalResults = await Promise.all(
      conflictingRegistrations.map(registration => registration.unregister()),
    )
    if (removalResults.some(isRemoved => !isRemoved))
      throw new PwaWorkerBoundaryError('PWA_CLEANUP_FAILED')

    shouldReload
      = controllerFilename !== undefined
        && conflictingWorkerFilenames.has(controllerFilename)
        && removalResults.some(Boolean)
  }

  if (mode !== 'pwa' && environment.cacheStorage) {
    const cacheNames = await environment.cacheStorage.keys()
    const deletionResults = await Promise.all(
      cacheNames
        .filter(isOwnedCache)
        .map(cacheName => environment.cacheStorage?.delete(cacheName) ?? Promise.resolve(false)),
    )
    if (deletionResults.some(isRemoved => !isRemoved))
      throw new PwaWorkerBoundaryError('PWA_CLEANUP_FAILED')
  }

  return getReloadDecision(shouldReload, environment.sessionStorage)
}

export async function reconcileServiceWorkerMode(
  mode: ServiceWorkerMode,
  environment: WorkerBoundaryEnvironment = getDefaultEnvironment(),
): Promise<boolean> {
  // AI modified: worker migration is bounded so stale browser state cannot hang application startup.
  return completeWithinCleanupBudget(
    reconcileOwnedWorkers(mode, environment),
    environment.timeoutMs ?? PWA_CLEANUP_TIMEOUT_MS,
  )
}
