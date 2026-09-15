import { expect, test } from '@playwright/test'

const runtimeConfig = JSON.stringify({
  schemaVersion: 1,
  api: { baseUrl: '/api' },
  notifications: { url: null, allowedOrigins: [] },
  navigation: { externalOrigins: [], iframeOrigins: [] },
})

test('blocks application bootstrap when Runtime Config is invalid', async ({ page }) => {
  await page.route('**/runtime-config.json', async (route) => {
    await route.fulfill({
      body: JSON.stringify({ schemaVersion: 2 }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.goto('/login')

  const recovery = page.locator('[data-application-recovery="runtime-config"]')
  await expect(recovery).toBeVisible()
  await expect(recovery).toContainText('CONFIG_VERSION_UNSUPPORTED')
  await expect(recovery).toContainText('/runtime-config.json')
  await expect(page.getByRole('button', { name: 'Reload configuration' })).toBeFocused()
})

test('boots exactly once after a corrected Runtime Config retry', async ({ page }) => {
  let requestCount = 0
  await page.route('**/runtime-config.json', async (route) => {
    requestCount += 1
    await route.fulfill({
      body: requestCount === 1 ? '{invalid-json' : runtimeConfig,
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.goto('/login')
  await expect(page.locator('[data-application-recovery="runtime-config"]')).toBeVisible()

  // AI modified: a manual retry reuses the guarded bootstrap instead of reloading the document.
  await page.getByRole('button', { name: 'Reload configuration' }).click()

  await expect(page.locator('[data-application-recovery="runtime-config"]')).toHaveCount(0)
  await expect(page.locator('#app')).toContainText(/Welcome back|欢迎回来/)
  expect(requestCount).toBe(2)
})
