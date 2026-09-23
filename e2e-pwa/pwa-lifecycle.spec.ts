import { expect, test } from '@playwright/test'

test('registers only the Base-scoped Gvueter worker and precache', async ({ page }) => {
  await page.goto('/admin/')

  await expect.poll(async () => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/admin/')
    return Boolean(registration?.active ?? registration?.waiting ?? registration?.installing)
  }), { timeout: 15_000 }).toBe(true)

  const workerDetails = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/admin/')
    const serviceWorker = registration?.active ?? registration?.waiting ?? registration?.installing
    return registration && serviceWorker
      ? { scope: registration.scope, scriptUrl: serviceWorker.scriptURL }
      : null
  })

  expect(workerDetails?.scope).toBe('http://127.0.0.1:4174/admin/')
  expect(workerDetails?.scriptUrl).toBe('http://127.0.0.1:4174/admin/pwa-sw.js')
  const registeredWorker = page.context().serviceWorkers().find(serviceWorker =>
    serviceWorker.url().endsWith('/admin/pwa-sw.js'),
  )
  expect(registeredWorker).toBeDefined()

  const readCachedUrls = async (): Promise<string[]> => registeredWorker!.evaluate(async () => {
    const cacheNames = await caches.keys()
    const cacheRequests = await Promise.all(
      cacheNames.filter(name => /^gvueter-pwa(?:-|$)/.test(name)).map(async (name) => {
        const cache = await caches.open(name)
        return (await cache.keys()).map(request => request.url)
      }),
    )
    return cacheRequests.flat()
  })

  // AI modified: installability caches the static shell but never API or deployment configuration.
  // AI modified: cache creation can precede completion of the Workbox precache population.
  await expect.poll(async () => (await readCachedUrls()).some(url =>
    url.includes('/admin/index.html'),
  ), { timeout: 15_000 }).toBe(true)

  const cachedUrls = await readCachedUrls()
  expect(cachedUrls.some(url => url.includes('/admin/index.html'))).toBe(true)
  expect(cachedUrls.some(url => new URL(url).pathname.includes('/api/') || url.endsWith('/runtime-config.json'))).toBe(false)
})
