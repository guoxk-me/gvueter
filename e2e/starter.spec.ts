import { expect, test } from '@playwright/test'

test('loads the public starter without a backend', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gvueter starter' })).toBeVisible()
  await expect(page.getByText('Configure an API endpoint when your backend is available.')).toBeVisible()
})

test('offers recovery for invalid deployment configuration', async ({ page }) => {
  await page.route('**/runtime-config.json', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ schemaVersion: 2, api: { baseUrl: 'http://unsafe.example.com' } }),
  }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Runtime configuration unavailable' })).toBeVisible()

  await page.unroute('**/runtime-config.json')
  await page.getByRole('button', { name: 'Reload configuration' }).click()
  await expect(page.getByRole('heading', { name: 'Gvueter starter' })).toBeVisible()
})
