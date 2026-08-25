import { describe, expect, it, vi } from 'vitest'
import {
  isPwaWorkerRegistration,
  MOCK_WORKER_FILENAME,
  PWA_CACHE_ID,
  PWA_WORKER_FILENAME,
  reconcileServiceWorkerMode,
} from '@/features/pwa/pwa-worker-boundary'

function worker(scriptFilename: string): ServiceWorker {
  return { scriptURL: `https://admin.example.com/${scriptFilename}` } as ServiceWorker
}

function registration(scriptFilename: string, unregister: () => Promise<boolean>) {
  return {
    active: worker(scriptFilename),
    installing: null,
    waiting: null,
    unregister,
  } as unknown as ServiceWorkerRegistration
}

describe('pWA service worker boundary', () => {
  it('rejects a same-scope MSW registration from PWA update checks', () => {
    const mockRegistration = registration(MOCK_WORKER_FILENAME, async () => true)
    const pwaRegistration = registration(PWA_WORKER_FILENAME, async () => true)

    expect(isPwaWorkerRegistration(mockRegistration)).toBe(false)
    expect(isPwaWorkerRegistration(pwaRegistration)).toBe(true)
  })

  it('removes an active PWA worker and its owned caches before Mock mode starts', async () => {
    const unregister = vi.fn(async () => true)
    const deleteCache = vi.fn(async () => true)

    const shouldReload = await reconcileServiceWorkerMode('mock', {
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
  })

  it('removes the MSW worker without deleting PWA caches in production mode', async () => {
    const unregisterMock = vi.fn(async () => true)
    const unregisterPwa = vi.fn(async () => true)
    const deleteCache = vi.fn(async () => true)

    const shouldReload = await reconcileServiceWorkerMode('pwa', {
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
})
