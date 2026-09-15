import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isPwaWorkerRegistration,
  MOCK_WORKER_FILENAME,
  PWA_CACHE_ID,
  PWA_RELOAD_GUARD_KEY,
  PWA_WORKER_FILENAME,
  PwaWorkerBoundaryError,
  reconcileServiceWorkerMode,
} from '@/features/pwa/pwa-worker-boundary'

const ORIGIN = 'https://admin.example.com'

function worker(scriptFilename: string): ServiceWorker {
  return { scriptURL: `${ORIGIN}/${scriptFilename}` } as ServiceWorker
}

function registration(scriptFilename: string, unregister: () => Promise<boolean>) {
  return {
    active: worker(scriptFilename),
    installing: null,
    scope: `${ORIGIN}/`,
    waiting: null,
    unregister,
  } as unknown as ServiceWorkerRegistration
}

beforeEach(() => sessionStorage.clear())

describe('pWA service worker boundary', () => {
  it('rejects a same-scope MSW registration from PWA update checks', () => {
    const mockRegistration = registration(MOCK_WORKER_FILENAME, async () => true)
    const pwaRegistration = registration(PWA_WORKER_FILENAME, async () => true)

    const ownership = { basePath: '/', origin: ORIGIN }
    expect(isPwaWorkerRegistration(mockRegistration, ownership)).toBe(false)
    expect(isPwaWorkerRegistration(pwaRegistration, ownership)).toBe(true)
  })

  it('removes an active PWA worker and its owned caches before Mock mode starts', async () => {
    const unregister = vi.fn(async () => true)
    const deleteCache = vi.fn(async () => true)

    const shouldReload = await reconcileServiceWorkerMode('mock', {
      basePath: '/',
      origin: ORIGIN,
      sessionStorage,
      serviceWorker: {
        controller: worker(PWA_WORKER_FILENAME),
        getRegistrations: async () => [registration(PWA_WORKER_FILENAME, unregister)],
      },
      cacheStorage: {
        keys: async () => [`${PWA_CACHE_ID}-precache`, 'unrelated-cache'],
        delete: deleteCache,
      },
    })

    expect(shouldReload).toBe(true)
    expect(unregister).toHaveBeenCalledOnce()
    expect(deleteCache).toHaveBeenCalledWith(`${PWA_CACHE_ID}-precache`)
    expect(deleteCache).not.toHaveBeenCalledWith('unrelated-cache')
    expect(sessionStorage.getItem(PWA_RELOAD_GUARD_KEY)).toBe('1')
  })

  it('removes the MSW worker without deleting PWA caches in production mode', async () => {
    const unregisterMock = vi.fn(async () => true)
    const unregisterPwa = vi.fn(async () => true)
    const deleteCache = vi.fn(async () => true)

    const shouldReload = await reconcileServiceWorkerMode('pwa', {
      basePath: '/',
      origin: ORIGIN,
      sessionStorage,
      serviceWorker: {
        controller: worker(MOCK_WORKER_FILENAME),
        getRegistrations: async () => [
          registration(MOCK_WORKER_FILENAME, unregisterMock),
          registration(PWA_WORKER_FILENAME, unregisterPwa),
        ],
      },
      cacheStorage: {
        keys: async () => [`${PWA_CACHE_ID}-precache`],
        delete: deleteCache,
      },
    })

    expect(shouldReload).toBe(true)
    expect(unregisterMock).toHaveBeenCalledOnce()
    expect(unregisterPwa).not.toHaveBeenCalled()
    expect(deleteCache).not.toHaveBeenCalled()
  })

  it('is a no-op when the browser has no service worker support', async () => {
    await expect(reconcileServiceWorkerMode('none', {})).resolves.toBe(false)
  })

  it('does not remove same-named workers outside the current origin and Base', async () => {
    const unregister = vi.fn(async () => true)
    const foreignRegistration = {
      active: { scriptURL: 'https://other.example.com/admin/pwa-sw.js' },
      installing: null,
      scope: 'https://other.example.com/admin/',
      unregister,
      waiting: null,
    } as unknown as ServiceWorkerRegistration

    await reconcileServiceWorkerMode('none', {
      basePath: '/admin/',
      origin: ORIGIN,
      serviceWorker: {
        controller: null,
        getRegistrations: async () => [foreignRegistration],
      },
    })

    expect(unregister).not.toHaveBeenCalled()
  })

  it('rejects failed cleanup instead of silently starting with a conflicting worker', async () => {
    await expect(reconcileServiceWorkerMode('none', {
      basePath: '/',
      origin: ORIGIN,
      serviceWorker: {
        controller: worker(PWA_WORKER_FILENAME),
        getRegistrations: async () => [registration(PWA_WORKER_FILENAME, async () => false)],
      },
    })).rejects.toBeInstanceOf(PwaWorkerBoundaryError)
  })
})
