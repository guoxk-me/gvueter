import type { Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const administratorCredentials = {
  email: 'admin@example.com',
  password: 'admin123',
} as const

async function signIn(page: Page): Promise<void> {
  const captchaChallenge = page
    .locator('[aria-label]')
    .filter({ hasText: /\d+\s*\+\s*\d+\s*=\s*\?/ })
    .first()
  await expect(captchaChallenge).toBeVisible()
  const operands = (await captchaChallenge.textContent())?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.getByRole('textbox', { name: 'Email' }).fill(administratorCredentials.email)
  await page.locator('input[type="password"]').fill(administratorCredentials.password)
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/dashboard')
}

async function expectNoAccessibilityViolations(page: Page): Promise<void> {
  // AI modified: axe inspects the settled page, not the low-opacity frame of the route transition.
  await page.waitForFunction(
    () =>
      !document.querySelector(
        '.admin-route-fade-enter-active, .admin-route-fade-leave-active, .admin-route-slide-enter-active, .admin-route-slide-leave-active',
      ),
  )
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  // AI modified: WebKit must finish finite theme and control transitions before axe samples colors.
  await page.evaluate(async () => {
    const finiteAnimations = document.getAnimations().filter((animation) => {
      const iterations = animation.effect?.getTiming().iterations
      return animation.playState === 'running' && iterations !== Infinity
    })
    await Promise.all(finiteAnimations.map(animation => animation.finished.catch(() => undefined)))
  })
  // AI modified: browser acceptance runs the WCAG A/AA and axe best-practice rules on real pages.
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'])
    .analyze()
  const diagnostic = scan.violations
    .map(
      violation =>
        `${violation.id} (${violation.impact ?? 'unknown'}): ${violation.nodes
          .map(node => node.target.join(' '))
          .join(', ')}`,
    )
    .join('\n')

  expect(scan.violations, diagnostic).toEqual([])
}

test('has no automated accessibility violations on representative public and admin pages', async ({
  page,
}) => {
  // AI modified: seven real-page axe scans can exceed the global interaction timeout on hosted WebKit.
  test.setTimeout(75_000)

  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en-US')
    // AI modified: the browser fixture uses the current AppSettings persistence contract.
    localStorage.setItem('appearance', JSON.stringify({ locale: 'en-US', themeMode: 'light' }))
  })

  // AI modified: the heading owns readiness after the document commits.
  await page.goto('/login', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  // AI modified: both account-recovery forms are first-class public authentication surfaces.
  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.goto('/reset-password')
  await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.goto('/sso/callback#ticket=invalid-ticket')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL('/sso/callback')
  await expectNoAccessibilityViolations(page)
  await page.getByRole('link', { name: 'Back to login' }).click()

  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.getByRole('link', { name: 'User Management' }).click()
  await expect(page.getByRole('heading', { name: 'User Management', level: 1 })).toBeVisible()
  await expectNoAccessibilityViolations(page)

  await page.getByRole('link', { name: 'Component Center' }).click()
  await expect(page.getByRole('heading', { name: 'Component Center', level: 1 })).toBeVisible()
  await expectNoAccessibilityViolations(page)
})

test('keeps runtime color edge cases readable in light and dark themes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('locale', 'en-US'))
  await page.goto('/login', { waitUntil: 'commit' })
  await signIn(page)

  for (const settings of [
    { customColor: '#ffffff', themeMode: 'light' },
    { customColor: '#000000', themeMode: 'dark' },
  ] as const) {
    await page.evaluate(({ customColor, themeMode }) => {
      const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
        string,
        unknown
      >
      // AI modified: browser acceptance covers user-selected colors at both contrast extremes.
      localStorage.setItem(
        'appearance',
        JSON.stringify({
          ...storedAppearance,
          customColor,
          destructiveColor: customColor,
          locale: 'en-US',
          successColor: customColor,
          themeColor: 'custom',
          themeMode,
          warningColor: customColor,
        }),
      )
    }, settings)
    // AI modified: the theme and axe assertions own readiness after the refreshed document commits.
    await page.reload({ waitUntil: 'commit' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', settings.themeMode)
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
    await expectNoAccessibilityViolations(page)
  }
})
