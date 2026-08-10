import type { Page } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'

type AppLocale = 'en-US' | 'zh-CN'
type ThemeMode = 'dark' | 'light'

interface ModuleVisualCase {
  locale: AppLocale
  screenshotPath: '/components/form' | '/components/table'
  snapshotName: string
  theme: ThemeMode
  viewport: { height: number; width: number }
}

const componentModulePaths = [
  '/components/table',
  '/components/form',
  '/components/upload-drag',
  '/components/selection',
  '/components/editors',
  '/components/icons',
  '/components/primitives',
  // AI modified: the route matrix includes the catalog-backed patterns module as the eighth module.
  '/components/patterns',
] as const

const moduleNavigationNames: Record<AppLocale, string> = {
  'en-US': 'Component center modules',
  'zh-CN': '组件中心模块',
}

const visualCases = [
  {
    locale: 'zh-CN',
    screenshotPath: '/components/table',
    snapshotName: 'component-modules-mobile-dark-zh.png',
    theme: 'dark',
    viewport: { height: 844, width: 390 },
  },
  {
    locale: 'en-US',
    screenshotPath: '/components/form',
    snapshotName: 'component-modules-desktop-light-en.png',
    theme: 'light',
    viewport: { height: 900, width: 1280 },
  },
] as const satisfies readonly ModuleVisualCase[]

async function signInAsAdmin(
  page: Page,
  locale: AppLocale,
  theme: ThemeMode,
  isReducedMotion = false,
): Promise<void> {
  await page.clock.setFixedTime(new Date('2026-07-14T08:00:00.000Z'))
  await page.emulateMedia({
    colorScheme: theme,
    reducedMotion: isReducedMotion ? 'reduce' : 'no-preference',
  })
  await page.addInitScript(
    ({ activeLocale, activeTheme }) => {
      // AI modified: visual variants enter through the same persisted settings contract as real users.
      localStorage.setItem('locale', activeLocale)
      localStorage.setItem('theme', activeTheme)
      localStorage.setItem(
        'appearance',
        JSON.stringify({
          componentSize: 'default',
          contentWidth: 'fluid',
          isBreadcrumbVisible: true,
          isFooterVisible: true,
          isHeaderSticky: true,
          isTabsVisible: true,
          isWatermarkVisible: false,
          layout: 'sidebar',
          locale: activeLocale,
          pageTransition: 'fade-slide',
          sidebarDefault: 'expanded',
          tabStyle: 'card',
          themeMode: activeTheme,
        }),
      )
    },
    { activeLocale: locale, activeTheme: theme },
  )

  await page.goto('/login')
  const captchaChallenge = page
    .locator('[aria-label]')
    .filter({ hasText: /\d+\s*\+\s*\d+\s*=\s*\?/ })
    .first()
  await expect(captchaChallenge).toBeVisible()
  const operands = (await captchaChallenge.textContent())?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.locator('input[type="email"]').fill('admin@example.com')
  await page.locator('input[type="password"]').fill('admin123')
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('.admin-layout')).toBeVisible()
  await page.waitForLoadState('load')
}

async function stabilizeVisualSurface(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      html, body, button, input, select, textarea {
        font-family: 'Inter', sans-serif !important;
        font-synthesis: none !important;
      }

      *, *::before, *::after {
        caret-color: transparent !important;
      }

      #__vue-devtools-container__, [data-sonner-toaster] {
        display: none !important;
      }
    `,
  })
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px Inter'),
      document.fonts.load('500 16px Inter'),
      document.fonts.load('600 16px Inter'),
      document.fonts.load('700 16px Inter'),
    ])
    await document.fonts.ready
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
  })
  await expect(page.locator('#nprogress')).toBeHidden()
  await expect(page.locator('main h1').first()).toBeVisible()
}

async function expectModuleLayout(
  page: Page,
  locale: AppLocale,
  expectedPath: (typeof componentModulePaths)[number],
): Promise<void> {
  await expect(page).toHaveURL(expectedPath)
  await expect(page.locator('html')).toHaveAttribute('lang', locale)

  const heading = page.locator('main h1').first()
  await expect(heading).toBeVisible()
  await expect(heading).not.toBeEmpty()

  const moduleNavigation = page.getByRole('navigation', {
    name: moduleNavigationNames[locale],
  })
  await expect(moduleNavigation).toBeVisible()
  const activeModuleLink = moduleNavigation.locator('a[aria-current="page"]')
  await expect(activeModuleLink).toHaveCount(1)
  await activeModuleLink.focus()
  await expect(activeModuleLink).toBeFocused()

  const geometry = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main')
    const title = main?.querySelector<HTMLElement>('h1')
    if (!main || !title)
      throw new Error('The component module requires a main landmark and page title')

    const titleRectangle = title.getBoundingClientRect()
    const titleCenterX = Math.min(
      Math.max(titleRectangle.left + titleRectangle.width / 2, 0),
      document.documentElement.clientWidth - 1,
    )
    const titleCenterY = Math.min(
      Math.max(titleRectangle.top + titleRectangle.height / 2, 0),
      document.documentElement.clientHeight - 1,
    )
    const titleHitTarget = document.elementFromPoint(titleCenterX, titleCenterY)
    const mainRectangle = main.getBoundingClientRect()
    // AI modified: preserve the owning DOM evidence when a module regresses at a responsive width.
    const overflowingElements = [...main.querySelectorAll<HTMLElement>('*')]
      .map((element) => {
        const rectangle = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)

        return {
          className: element.className,
          clientWidth: element.clientWidth,
          overflowX: style.overflowX,
          right: Math.round(rectangle.right * 100) / 100,
          scrollWidth: element.scrollWidth,
          tagName: element.tagName.toLowerCase(),
          testId: element.dataset.testid ?? null,
          text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120),
        }
      })
      .filter(
        (element) =>
          element.right > mainRectangle.right + 1 || element.scrollWidth > element.clientWidth + 1,
      )
      .slice(0, 20)

    // AI modified: layout acceptance checks the actual rendered geometry, including title occlusion.
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      isTitleTopmost: title === titleHitTarget || title.contains(titleHitTarget),
      mainClientWidth: main.clientWidth,
      mainScrollWidth: main.scrollWidth,
      overflowingElements,
      titleLeft: titleRectangle.left,
      titleRight: titleRectangle.right,
    }
  })

  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth)
  expect(
    geometry.mainScrollWidth,
    `main overflow candidates: ${JSON.stringify(geometry.overflowingElements)}`,
  ).toBeLessThanOrEqual(geometry.mainClientWidth + 1)
  expect(geometry.titleLeft).toBeGreaterThanOrEqual(0)
  expect(geometry.titleRight).toBeLessThanOrEqual(geometry.documentClientWidth + 1)
  expect(geometry.isTitleTopmost).toBe(true)
}

for (const visualCase of visualCases) {
  test(`keeps every component module stable at ${visualCase.viewport.width}px in ${visualCase.locale} ${visualCase.theme}`, async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.setViewportSize(visualCase.viewport)
    await signInAsAdmin(page, visualCase.locale, visualCase.theme)

    for (const componentModulePath of componentModulePaths) {
      await page.goto(componentModulePath)
      await expectModuleLayout(page, visualCase.locale, componentModulePath)
      if (componentModulePath === visualCase.screenshotPath) {
        await stabilizeVisualSurface(page)
        await expect(page).toHaveScreenshot(visualCase.snapshotName, {
          animations: 'disabled',
          maxDiffPixelRatio: 0.01,
        })
      }
    }

    const rootElement = page.locator('html')
    if (visualCase.theme === 'dark') await expect(rootElement).toHaveClass(/dark/)
    else await expect(rootElement).not.toHaveClass(/dark/)
  })
}

test('keeps animated cached routes visible across URL-state and module navigation', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signInAsAdmin(page, 'en-US', 'light')
  await page.goto('/components/table')

  await page.getByRole('tab', { name: 'Interaction' }).click()
  await expect(page).toHaveURL('/components/table?tableGroup=interaction')
  // AI modified: query-owned state updates the active logical page instead of opening duplicate tabs.
  await expect(page.getByRole('tab', { name: 'Tables', exact: true })).toHaveCount(1)
  // AI modified: wait beyond the route animation budget to detect an outlet stranded on its comment placeholder.
  await page.waitForTimeout(300)
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Table patterns for real administrative work',
    }),
  ).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Component center modules' })
    .getByRole('link', { name: 'Forms', exact: true })
    .click()
  await expect(page).toHaveURL('/components/form')
  await page.waitForTimeout(300)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Complete form patterns' }),
  ).toBeVisible()
})

test('submits schema fields and real evidence bytes in one multipart command', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await signInAsAdmin(page, 'en-US', 'light')
  await page.goto('/components/form')

  const schemaForm = page.getByRole('region', {
    name: 'Schema-driven form: release request',
  })
  await schemaForm
    .getByRole('combobox', { name: 'Remotely loaded service owner' })
    .selectOption('release-engineering')
  await schemaForm.getByRole('switch', { name: 'Evidence is required' }).click()

  const fileChooserPromise = page.waitForEvent('filechooser')
  await schemaForm.getByRole('button', { name: /Evidence files.*Browse files/ }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'release-proof.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\n%EOF'),
  })

  await expect(schemaForm.getByText('release-proof.pdf', { exact: true })).toBeVisible()
  await schemaForm.getByRole('button', { name: 'Submit schema form' }).click()
  // AI modified: browser evidence proves native File serialization reaches the strict multipart server.
  const submissionStatus = schemaForm.getByTestId('schema-form-status')
  await expect(submissionStatus).toContainText('1 file(s) stored')
  await expect(submissionStatus).toContainText('schema-submission-')
})

test('keeps representative module interactions keyboard reachable with reduced motion', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ height: 900, width: 1280 })
  await signInAsAdmin(page, 'en-US', 'light', true)

  await page.goto('/components/table')
  await page.getByRole('tab', { name: 'Interaction' }).click()
  await expect(page.getByTestId('begin-row-edit')).toBeVisible()

  await page.goto('/components/form')
  const basicForm = page.locator('#basic-form-example')
  await basicForm.getByLabel('Display name').fill('Browser verification owner')
  await basicForm.getByRole('button', { name: 'Save profile' }).click()
  await expect(basicForm.getByTestId('basic-form-status')).toContainText(
    'Browser verification owner',
  )

  await page.goto('/components/upload-drag')
  const movableCard = page.locator('[data-board-card="card-access-review"]')
  await movableCard.focus()
  await page.keyboard.press('Alt+ArrowRight')
  await expect(
    page.locator('[data-board-lane="in-progress"] [data-board-card="card-access-review"]'),
  ).toBeVisible()

  await page.goto('/components/selection')
  const remoteSearchSection = page.locator('#selection-remote')
  await remoteSearchSection.getByRole('button', { name: 'Success', exact: true }).click()
  await expect(remoteSearchSection.getByTestId('remote-search-phase')).toHaveText('ready')
  await remoteSearchSection.getByRole('option', { name: /Luna Lin/ }).click()
  await expect(
    remoteSearchSection.getByRole('status').filter({ hasText: 'Selected:' }),
  ).toContainText('Luna Lin')

  await page.goto('/components/editors')
  await page.getByRole('button', { name: 'Simulate pasted HTML' }).click()
  const sanitizedSource = page.locator('pre[translate="no"]').filter({ hasText: 'Pasted briefing' })
  await expect(sanitizedSource).toContainText('Pasted briefing')
  await expect(sanitizedSource).not.toContainText('onclick')
  await expect(sanitizedSource).not.toContainText('<script')

  await page.goto('/components/icons')
  await page.getByLabel('Search the icon inventory').fill('LayoutDashboard')
  await expect(page.locator('[data-icon-key]')).toHaveCount(1)
  await expect(page.locator('[data-icon-key]').first()).toContainText('LayoutDashboard')

  await page.goto('/components/primitives')
  const dialogTrigger = page.getByTestId('open-primitive-dialog')
  await dialogTrigger.click()
  await expect(page.locator('[data-primitive-overlay="dialog"]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-primitive-overlay="dialog"]')).toBeHidden()
  await expect(dialogTrigger).toBeFocused()

  await expect
    .poll(() => page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true)
  const activeModuleLink = page
    .getByRole('navigation', { name: 'Component center modules' })
    .locator('a[aria-current="page"]')
  const transitionDurationsInMilliseconds = await activeModuleLink.evaluate((element) =>
    getComputedStyle(element)
      .transitionDuration.split(',')
      .map((duration) => {
        const requestedDuration = duration.trim()
        return requestedDuration.endsWith('ms')
          ? Number.parseFloat(requestedDuration)
          : Number.parseFloat(requestedDuration) * 1_000
      }),
  )
  expect(Math.max(...transitionDurationsInMilliseconds)).toBeLessThanOrEqual(0.011)
})
