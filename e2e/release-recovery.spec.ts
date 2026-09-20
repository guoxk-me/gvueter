import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function openEnglishLogin(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en-US')
    localStorage.setItem('appearance', JSON.stringify({ locale: 'en-US' }))
  })
  // AI modified: the heading owns readiness after the document commits.
  await page.goto('/login', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
}

test('shows the application recovery surface for a Vite preload error', async ({ page }) => {
  await openEnglishLogin(page)

  const wasCanceled = await page.evaluate(() => {
    const preloadEvent = Object.assign(new Event('vite:preloadError', { cancelable: true }), {
      payload: new Error('Synthetic chunk diagnostic'),
    })
    window.dispatchEvent(preloadEvent)
    return preloadEvent.defaultPrevented
  })

  expect(wasCanceled).toBe(true)
  await expect(page.locator('[data-application-recovery="asset-preload"]')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Page resources could not be loaded' }),
  ).toBeVisible()
  await expect(page.getByText('Synthetic chunk diagnostic')).toHaveCount(0)

  await page.getByRole('button', { name: 'Reload application' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('recovers visibly when a production lazy route chunk cannot load', async ({ page }) => {
  await openEnglishLogin(page)

  // AI modified: taking the browser offline forces one real, not-yet-loaded production route chunk to fail.
  await page.context().setOffline(true)
  await page.getByRole('link', { name: 'Forgot password?' }).click()

  const recoverySurface = page.locator('[data-application-recovery]')
  await expect(recoverySurface).toBeVisible()
  await expect(recoverySurface).toHaveAttribute(
    'data-application-recovery',
    /^(asset-preload|navigation)$/,
  )
  await expect(
    page.getByRole('heading', {
      name: /Page resources could not be loaded|The page could not be opened/,
    }),
  ).toBeVisible()
  await expect(page.getByText(/dynamically imported module|chunk load/i)).toHaveCount(0)

  await page.context().setOffline(false)
  await page.getByRole('button', { name: 'Reload application' }).click()
  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
