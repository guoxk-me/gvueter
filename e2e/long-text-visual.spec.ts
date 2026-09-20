import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const viewportWidths = [320, 375, 390, 768, 1024, 1280, 1440, 1920] as const
const locales = ['en-US', 'zh-CN'] as const
const pageCases = [
  { id: 'dashboard', path: '/dashboard' },
  { id: 'users', path: '/users' },
  { id: 'components', path: '/components' },
] as const

type AppLocale = (typeof locales)[number]
type PageCase = (typeof pageCases)[number]

interface VisualSnapshotCase {
  locale: AppLocale
  pageId: PageCase['id']
  snapshotName: string
  viewportWidth: number
}

const coreVisualSnapshotCases: readonly VisualSnapshotCase[] = locales.flatMap(locale =>
  viewportWidths.map(viewportWidth => ({
    locale,
    pageId: 'dashboard' as const,
    snapshotName: `long-text-dashboard-${viewportWidth}-${locale === 'en-US' ? 'en' : 'zh'}.png`,
    viewportWidth,
  })),
)

const visualSnapshotCases: readonly VisualSnapshotCase[] = [
  // AI modified: every supported width has paired English and Chinese evidence on the same core page.
  ...coreVisualSnapshotCases,
  {
    locale: 'zh-CN',
    pageId: 'components',
    snapshotName: 'long-text-components-mobile-zh.png',
    viewportWidth: 390,
  },
  {
    locale: 'en-US',
    pageId: 'users',
    snapshotName: 'long-text-users-breakpoint-en.png',
    viewportWidth: 1024,
  },
  {
    locale: 'zh-CN',
    pageId: 'dashboard',
    snapshotName: 'long-text-dashboard-desktop-zh.png',
    viewportWidth: 1440,
  },
]

async function signInAsAdmin(page: Page, locale: AppLocale): Promise<void> {
  // AI modified: relative labels and date-backed Mock responses stay deterministic in visual runs.
  await page.clock.setFixedTime(new Date('2026-07-14T08:00:00.000Z'))
  await page.addInitScript((activeLocale: AppLocale) => {
    const storedSettings: unknown = JSON.parse(localStorage.getItem('appearance') ?? '{}')
    const appearanceSettings
      = typeof storedSettings === 'object' && storedSettings !== null
        ? (storedSettings as Record<string, unknown>)
        : {}

    localStorage.setItem('locale', activeLocale)
    localStorage.setItem('theme', 'light')
    localStorage.setItem(
      'appearance',
      JSON.stringify({
        ...appearanceSettings,
        locale: activeLocale,
        layout: 'top',
        themeMode: 'light',
        contentWidth: 'fluid',
        componentSize: 'default',
        pageTransition: 'none',
        isWatermarkVisible: false,
      }),
    )
  }, locale)

  // AI modified: visible login controls own readiness after the document commits.
  await page.goto('/login', { waitUntil: 'commit' })
  const captchaChallenge = page
    .locator('[aria-label]')
    .filter({ hasText: /\d+\s*\+\s*\d+\s*=\s*\?/ })
    .first()
  await expect(captchaChallenge).toBeVisible()
  const challengeText = await captchaChallenge.textContent()
  const operands = challengeText?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.locator('input[type="email"]').fill('admin@example.com')
  await page.locator('input[type="password"]').fill('admin123')
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('.admin-layout[data-layout="top"]')).toBeVisible()
}

async function waitForPageContent(page: Page, pageCase: PageCase): Promise<void> {
  await page.goto(pageCase.path)
  await expect(page.locator('main h1').first()).toBeVisible()

  if (pageCase.id === 'dashboard')
    await expect(page.getByTestId('dashboard-loading')).toBeHidden()

  if (pageCase.id === 'users') {
    await expect(page.getByTestId('pro-table')).toBeVisible()
    await expect.poll(() => page.locator('tbody tr[data-row-id]').count()).toBeGreaterThan(0)
  }

  await page.evaluate(() => document.fonts?.ready)
}

async function inflateVisibleLabels(page: Page): Promise<void> {
  // AI modified: exercise 150% copy expansion without mutating inputs, code samples, or brand identifiers.
  await page.evaluate(() => {
    const preservedAncestorSelector = [
      'code',
      'pre',
      'kbd',
      'samp',
      'script',
      'style',
      'textarea',
      'input',
      'select',
      'option',
      '[contenteditable="true"]',
      '[translate="no"]',
      '[data-long-text-preserve]',
    ].join(',')
    const measurementSelector = '[data-top-navigation-measure], [data-top-navigation-more-measure]'
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const textNodes: Text[] = []

    while (walker.nextNode()) textNodes.push(walker.currentNode as Text)

    for (const textNode of textNodes) {
      const parent = textNode.parentElement
      const originalText = textNode.textContent ?? ''
      const visibleText = originalText.trim()
      if (!parent || visibleText.length < 2 || parent.closest(preservedAncestorSelector))
        continue
      if (!/[\p{L}\p{N}]/u.test(visibleText))
        continue

      const isNavigationMeasurement = Boolean(parent.closest(measurementSelector))
      const isAriaHidden = Boolean(parent.closest('[aria-hidden="true"]'))
      // AI modified: Motion labels are aria-hidden for naming, but remain visible copy-expansion targets.
      const isVisibleMotionLabel = Boolean(parent.closest('[data-motion-part="navigation-label"]'))
      const parentStyle = window.getComputedStyle(parent)
      const isVisuallyHidden
        = parentStyle.display === 'none'
          || parentStyle.visibility === 'hidden'
          || parent.getClientRects().length === 0
      if (!isNavigationMeasurement && !isVisibleMotionLabel && (isAriaHidden || isVisuallyHidden))
        continue

      const characters = Array.from(visibleText)
      const extraCharacters = characters
        .slice(0, Math.max(1, Math.ceil(characters.length / 2)))
        .join('')
      textNode.textContent = originalText.replace(visibleText, `${visibleText} ${extraCharacters}`)
    }

    document.documentElement.dataset.longTextExpansion = '150'
    window.dispatchEvent(new Event('resize'))
  })

  await page.waitForTimeout(100)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

async function addStableVisualStyles(page: Page): Promise<void> {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.addStyleTag({
    content: `
      html, body, button, input, select, textarea {
        font-family: 'Inter', sans-serif !important;
        font-synthesis: none !important;
      }

      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }

      #__vue-devtools-container__ {
        display: none !important;
      }
    `,
  })
  await page.evaluate(async () => {
    // AI modified: screenshots wait for the bundled font instead of racing platform fallback metrics.
    await Promise.all([
      document.fonts.load('400 16px Inter'),
      document.fonts.load('500 16px Inter'),
      document.fonts.load('600 16px Inter'),
      document.fonts.load('700 16px Inter'),
    ])
    await document.fonts.ready
  })
}

const longContentFixtures = {
  error:
    'The audit export could not be completed because the upstream compliance archive returned a validation response with remediation guidance for every affected tenant.',
  filename:
    'quarterly-enterprise-access-review-evidence-export-with-regional-approvals-and-retention-metadata-2026-07-14.csv',
  identifier: 'TENANTPRODUCTIONEUWESTAUDITEXPORTCONFIGURATIONIDENTIFIERWITHOUTSEPARATORS',
  userEmail:
    'security-observability-and-compliance-automation-owner@extremely-long-enterprise-subdomain.example.com',
} as const

async function addLongContentFixtureRegion(page: Page): Promise<void> {
  // AI modified: semantic visible fields exercise unbroken business content rather than protected code or inputs.
  await page.evaluate((fixtures) => {
    const main = document.querySelector<HTMLElement>('main')
    if (!main)
      throw new Error('Long-content fixtures require a rendered main landmark')

    const fixtureRegion = document.createElement('section')
    fixtureRegion.dataset.longContentFixtures = 'true'
    fixtureRegion.setAttribute('aria-labelledby', 'long-content-fixture-title')
    Object.assign(fixtureRegion.style, {
      border: '1px solid var(--border)',
      borderRadius: '0.5rem',
      boxSizing: 'border-box',
      display: 'grid',
      gap: '0.75rem',
      maxWidth: '100%',
      minWidth: '0',
      padding: '1rem',
      width: '100%',
    })

    const title = document.createElement('h2')
    title.id = 'long-content-fixture-title'
    title.textContent = 'Long-content boundary fixtures'
    fixtureRegion.append(title)

    const fixtureLabels = {
      filename: 'Export filename',
      identifier: 'Configuration identifier',
      userEmail: 'Escalation owner',
    } as const
    const descriptionList = document.createElement('dl')
    Object.assign(descriptionList.style, {
      display: 'grid',
      gap: '0.5rem',
      margin: '0',
      maxWidth: '100%',
      minWidth: '0',
    })

    for (const fixtureName of ['identifier', 'userEmail', 'filename'] as const) {
      const term = document.createElement('dt')
      term.textContent = fixtureLabels[fixtureName]
      const description = document.createElement('dd')
      description.dataset.longContentFixture = fixtureName
      description.textContent = fixtures[fixtureName]
      Object.assign(description.style, {
        margin: '0',
        maxWidth: '100%',
        minWidth: '0',
        overflowWrap: 'anywhere',
      })
      descriptionList.append(term, description)
    }

    const errorMessage = document.createElement('p')
    errorMessage.dataset.longContentFixture = 'error'
    errorMessage.setAttribute('role', 'alert')
    errorMessage.textContent = fixtures.error
    Object.assign(errorMessage.style, {
      margin: '0',
      maxWidth: '100%',
      minWidth: '0',
      overflowWrap: 'anywhere',
    })

    fixtureRegion.append(descriptionList, errorMessage)
    main.prepend(fixtureRegion)
  }, longContentFixtures)
}

async function expectLongContentFixturesToRemainReadable(page: Page): Promise<void> {
  const fixtureRegion = page.locator('[data-long-content-fixtures]')
  await expect(fixtureRegion).toBeVisible()
  await expect(fixtureRegion.getByRole('alert')).toBeVisible()

  const fixtureGeometry = await fixtureRegion
    .locator('[data-long-content-fixture]')
    .evaluateAll((elements, fixtures) => {
      const fixtureValues = fixtures as Record<string, string>
      const viewportWidth = document.documentElement.clientWidth

      return elements.map((element) => {
        const htmlElement = element as HTMLElement
        const bounds = htmlElement.getBoundingClientRect()
        const fixtureName = htmlElement.dataset.longContentFixture ?? ''
        const renderedText = htmlElement.textContent ?? ''
        return {
          containsOriginalText: renderedText.includes(fixtureValues[fixtureName] ?? ''),
          fixtureName,
          hasExpandedText: renderedText.length > (fixtureValues[fixtureName]?.length ?? 0),
          isInsideViewport: bounds.left >= -1 && bounds.right <= viewportWidth + 1,
          isWidthContained: htmlElement.scrollWidth <= htmlElement.clientWidth + 1,
          overflowWrap: window.getComputedStyle(htmlElement).overflowWrap,
        }
      })
    }, longContentFixtures)

  expect(fixtureGeometry).toHaveLength(4)
  expect(fixtureGeometry).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ fixtureName: 'identifier' }),
      expect.objectContaining({ fixtureName: 'userEmail' }),
      expect.objectContaining({ fixtureName: 'filename' }),
      expect.objectContaining({ fixtureName: 'error' }),
    ]),
  )
  for (const fixture of fixtureGeometry) {
    expect(
      fixture.containsOriginalText,
      `${fixture.fixtureName} lost its complete business value`,
    ).toBe(true)
    expect(
      fixture.hasExpandedText,
      `${fixture.fixtureName} did not participate in 150% expansion`,
    ).toBe(true)
    expect(fixture.isInsideViewport, `${fixture.fixtureName} escaped the viewport`).toBe(true)
    expect(fixture.isWidthContained, `${fixture.fixtureName} owns horizontal overflow`).toBe(true)
    expect(fixture.overflowWrap).toBe('anywhere')
  }
}

async function expectDocumentWithoutHorizontalOverflow(page: Page): Promise<void> {
  const documentGeometry = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const overflowingElements = [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((element) => {
        const style = window.getComputedStyle(element)
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || element.getClientRects().length === 0
        ) {
          return false
        }
        const bounds = element.getBoundingClientRect()
        return bounds.left < -1 || bounds.right > viewportWidth + 1
      })
      .slice(0, 8)
      .map(element => ({
        className: element.className,
        tagName: element.tagName,
        testId: element.dataset.testid,
      }))

    return {
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      overflowingElements,
      viewportWidth,
    }
  })

  const overflowContext = JSON.stringify(documentGeometry.overflowingElements)
  expect(
    documentGeometry.documentScrollWidth,
    `document overflowed at ${documentGeometry.viewportWidth}px; candidates: ${overflowContext}`,
  ).toBeLessThanOrEqual(documentGeometry.viewportWidth + 1)
  expect(
    documentGeometry.bodyScrollWidth,
    `body overflowed at ${documentGeometry.viewportWidth}px; candidates: ${overflowContext}`,
  ).toBeLessThanOrEqual(documentGeometry.viewportWidth + 1)
}

async function expectPageHeaderWithoutCollisions(page: Page): Promise<void> {
  const headerCollisions = await page.locator('main header').evaluateAll((headers) => {
    return headers.flatMap((header, headerIndex) => {
      const visibleChildren = [...header.children].filter((child) => {
        const style = window.getComputedStyle(child)
        const bounds = child.getBoundingClientRect()
        return (
          style.display !== 'none'
          && style.visibility !== 'hidden'
          && bounds.width > 0
          && bounds.height > 0
        )
      })

      return visibleChildren.flatMap((firstChild, firstIndex) => {
        const firstBounds = firstChild.getBoundingClientRect()
        return visibleChildren.slice(firstIndex + 1).flatMap((secondChild, secondOffset) => {
          const secondBounds = secondChild.getBoundingClientRect()
          const horizontalOverlap
            = Math.min(firstBounds.right, secondBounds.right)
              - Math.max(firstBounds.left, secondBounds.left)
          const verticalOverlap
            = Math.min(firstBounds.bottom, secondBounds.bottom)
              - Math.max(firstBounds.top, secondBounds.top)

          return horizontalOverlap > 1 && verticalOverlap > 1
            ? [
                {
                  firstChild: firstIndex,
                  headerIndex,
                  secondChild: firstIndex + secondOffset + 1,
                },
              ]
            : []
        })
      })
    })
  })

  expect(headerCollisions, 'PageHeader content and actions must not intersect').toEqual([])
}

async function expectShellWithoutCollisions(page: Page, viewportWidth: number): Promise<void> {
  const shellGeometry = await page.evaluate(() => {
    const shellHeader = document.querySelector<HTMLElement>('[data-layout-region="header"]')
    const shellBody = document.querySelector<HTMLElement>('.admin-layout__body')
    if (!shellHeader || !shellBody)
      throw new Error('Admin Shell regions were not rendered')

    const headerBounds = shellHeader.getBoundingClientRect()
    const bodyBounds = shellBody.getBoundingClientRect()
    const visibleHeaderChildren = [...shellHeader.children]
      .filter((child) => {
        const style = window.getComputedStyle(child)
        const bounds = child.getBoundingClientRect()
        return (
          style.display !== 'none'
          && style.visibility !== 'hidden'
          && bounds.width > 0
          && bounds.height > 0
        )
      })
      .map((child) => {
        const bounds = child.getBoundingClientRect()
        return {
          bottom: bounds.bottom,
          left: bounds.left,
          right: bounds.right,
          top: bounds.top,
        }
      })
    const headerChildCollisions: Array<{ firstIndex: number, secondIndex: number }> = []

    for (const [firstIndex, firstBounds] of visibleHeaderChildren.entries()) {
      for (const [secondIndex, secondBounds] of visibleHeaderChildren.entries()) {
        if (secondIndex <= firstIndex)
          continue
        const horizontalOverlap
          = Math.min(firstBounds.right, secondBounds.right)
            - Math.max(firstBounds.left, secondBounds.left)
        const verticalOverlap
          = Math.min(firstBounds.bottom, secondBounds.bottom)
            - Math.max(firstBounds.top, secondBounds.top)
        if (horizontalOverlap > 1 && verticalOverlap > 1)
          headerChildCollisions.push({ firstIndex, secondIndex })
      }
    }

    const topNavigation = document.querySelector<HTMLElement>('[data-top-navigation]')
    const navigationBounds = topNavigation?.getBoundingClientRect()
    const clippedNavigationControls = topNavigation
      ? [...topNavigation.querySelectorAll<HTMLElement>('a, button')]
          .filter((element) => {
            const style = window.getComputedStyle(element)
            const bounds = element.getBoundingClientRect()
            return (
              style.display !== 'none'
              && style.visibility !== 'hidden'
              && bounds.width > 0
              && bounds.height > 0
            )
          })
          .filter((element) => {
            const bounds = element.getBoundingClientRect()
            return navigationBounds
              ? bounds.left < navigationBounds.left - 1 || bounds.right > navigationBounds.right + 1
              : false
          })
          .map(element => element.textContent?.trim() ?? element.getAttribute('aria-label') ?? '')
      : []

    return {
      bodyTop: bodyBounds.top,
      clippedNavigationControls,
      hasMoreNavigation: Boolean(document.querySelector('[data-top-navigation-more]')),
      headerBottom: headerBounds.bottom,
      headerChildCollisions,
      isMobileNavigationVisible: (() => {
        const mobileNavigation = shellHeader.querySelector<HTMLElement>(
          '[aria-controls="admin-mobile-navigation"]',
        )
        if (!mobileNavigation)
          return false
        const style = window.getComputedStyle(mobileNavigation)
        const bounds = mobileNavigation.getBoundingClientRect()
        return style.display !== 'none' && bounds.width > 0 && bounds.height > 0
      })(),
      isTopNavigationVisible: Boolean(
        topNavigation
        && window.getComputedStyle(topNavigation).display !== 'none'
        && (navigationBounds?.width ?? 0) > 0,
      ),
    }
  })

  expect(shellGeometry.headerBottom).toBeLessThanOrEqual(shellGeometry.bodyTop + 1)
  expect(shellGeometry.headerChildCollisions, 'visible Header children must not overlap').toEqual(
    [],
  )
  expect(
    shellGeometry.clippedNavigationControls,
    'top-navigation controls must stay inside their rail',
  ).toEqual([])

  if (viewportWidth < 1024) {
    expect(shellGeometry.isMobileNavigationVisible).toBe(true)
    expect(shellGeometry.isTopNavigationVisible).toBe(false)
  }
  else {
    expect(shellGeometry.isMobileNavigationVisible).toBe(false)
    expect(shellGeometry.isTopNavigationVisible).toBe(true)
  }

  if (viewportWidth === 1024)
    expect(shellGeometry.hasMoreNavigation).toBe(true)
}

async function expectPositiveInteractiveSizes(page: Page): Promise<void> {
  const invalidControls = await page.evaluate(() => {
    const selector = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="checkbox"]',
      '[role="combobox"]',
      '[role="link"]',
      '[role="tab"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    return [...document.querySelectorAll<HTMLElement>(selector)]
      .filter((element) => {
        const style = window.getComputedStyle(element)
        return (
          !element.closest('[hidden], [inert]')
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && element.getClientRects().length > 0
        )
      })
      .filter((element) => {
        const bounds = element.getBoundingClientRect()
        return (
          !Number.isFinite(bounds.width)
          || !Number.isFinite(bounds.height)
          || bounds.width <= 0
          || bounds.height <= 0
        )
      })
      .map(element => ({
        ariaLabel: element.getAttribute('aria-label'),
        tagName: element.tagName,
        text: element.textContent?.trim().slice(0, 60),
      }))
  })

  expect(invalidControls, 'visible interactive controls require a positive hit area').toEqual([])
}

async function expectTableOverflowOwnedByViewport(
  page: Page,
  viewportWidth: number,
): Promise<void> {
  const tableViewport = page.getByTestId('pro-table-viewport')
  await expect(tableViewport).toBeVisible()
  const tableGeometry = await tableViewport.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const mainBounds = element.closest('main')?.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return {
      clientWidth: element.clientWidth,
      left: bounds.left,
      mainLeft: mainBounds?.left ?? 0,
      mainRight: mainBounds?.right ?? document.documentElement.clientWidth,
      overflowX: style.overflowX,
      right: bounds.right,
      scrollWidth: element.scrollWidth,
    }
  })

  expect(tableGeometry.left).toBeGreaterThanOrEqual(tableGeometry.mainLeft - 1)
  expect(tableGeometry.right).toBeLessThanOrEqual(tableGeometry.mainRight + 1)
  expect(tableGeometry.overflowX).toMatch(/auto|scroll/)
  expect(tableGeometry.scrollWidth).toBeGreaterThanOrEqual(tableGeometry.clientWidth)

  const verticallyOverflowingRows = await tableViewport
    .locator('tbody tr[data-row-id]')
    .evaluateAll(rows =>
      rows.flatMap((row) => {
        const rowBounds = row.getBoundingClientRect()
        const overflowingContent = [...row.querySelectorAll<HTMLElement>('*')].some((content) => {
          const style = window.getComputedStyle(content)
          if (
            style.display === 'none'
            || style.visibility === 'hidden'
            || content.getClientRects().length === 0
          ) {
            return false
          }

          const contentBounds = content.getBoundingClientRect()
          return (
            contentBounds.top < rowBounds.top - 1 || contentBounds.bottom > rowBounds.bottom + 1
          )
        })
        const hasVerticalScrollOverflow = row.scrollHeight > row.clientHeight + 1

        return overflowingContent || hasVerticalScrollOverflow
          ? [
              {
                clientHeight: row.clientHeight,
                rowId: row.dataset.rowId,
                scrollHeight: row.scrollHeight,
              },
            ]
          : []
      }),
    )
  // AI modified: wrapped identity text must expand its row instead of covering adjacent records.
  expect(verticallyOverflowingRows, 'table cell content must remain inside its owning row').toEqual(
    [],
  )

  if (viewportWidth <= 768)
    expect(tableGeometry.scrollWidth).toBeGreaterThan(tableGeometry.clientWidth)

  if (tableGeometry.scrollWidth > tableGeometry.clientWidth) {
    const didScroll = await tableViewport.evaluate((element) => {
      const originalScrollLeft = element.scrollLeft
      element.scrollLeft = element.scrollWidth
      const hasMoved = element.scrollLeft > originalScrollLeft
      element.scrollLeft = originalScrollLeft
      return hasMoved
    })
    expect(didScroll).toBe(true)
  }
}

function getVisualSnapshot(
  locale: AppLocale,
  viewportWidth: number,
  pageId: PageCase['id'],
): VisualSnapshotCase | undefined {
  return visualSnapshotCases.find(
    snapshotCase =>
      snapshotCase.locale === locale
      && snapshotCase.viewportWidth === viewportWidth
      && snapshotCase.pageId === pageId,
  )
}

async function expectVisualSnapshot(page: Page, snapshotName: string): Promise<void> {
  // AI modified: prior form clicks cannot leak a transient hover state into route snapshots.
  await page.mouse.move(0, 0)
  const masks: Locator[] = [
    page.locator('canvas'),
    page.locator('iframe'),
    page.locator('[data-slot="chart"]'),
    page.locator('[data-testid="dashboard-loading"]'),
  ]
  await expect(page).toHaveScreenshot(snapshotName, {
    animations: 'disabled',
    caret: 'hide',
    mask: masks,
    maskColor: '#e5e7eb',
    maxDiffPixelRatio: 0.005,
  })
}

async function openExpandedAppearancePanel(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Appearance', exact: true }).click()
  const appearancePanel = page.locator('[data-slot="sheet-content"]')
  await expect(appearancePanel).toBeVisible()

  const presetGrid = appearancePanel
    .getByRole('heading', { name: 'Presets', exact: true })
    .locator('xpath=following-sibling::div[1]')
  const themeModeGrid = appearancePanel
    .getByRole('heading', { name: 'Theme Mode', exact: true })
    .locator('xpath=following-sibling::div[1]')
  const componentSizeGrid = appearancePanel
    .getByText('Component Size', { exact: true })
    .locator('xpath=following-sibling::div[1]')

  await presetGrid.evaluate(element => element.setAttribute('data-visual-grid', 'presets'))
  await themeModeGrid.evaluate(element => element.setAttribute('data-visual-grid', 'theme-mode'))
  await componentSizeGrid.evaluate(element =>
    element.setAttribute('data-visual-grid', 'component-size'),
  )
  await inflateVisibleLabels(page)
  return appearancePanel
}

async function expectAppearancePanelGeometry(
  page: Page,
  appearancePanel: Locator,
  viewportWidth: 320 | 390 | 1024,
): Promise<void> {
  await expectDocumentWithoutHorizontalOverflow(page)
  const panelGeometry = await appearancePanel.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const style = window.getComputedStyle(element)
    return {
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      left: bounds.left,
      overflowY: style.overflowY,
      right: bounds.right,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      viewportHeight: document.documentElement.clientHeight,
      viewportWidth: document.documentElement.clientWidth,
    }
  })

  expect(panelGeometry.left).toBeGreaterThanOrEqual(-1)
  expect(panelGeometry.right).toBeLessThanOrEqual(panelGeometry.viewportWidth + 1)
  expect(panelGeometry.clientHeight).toBeLessThanOrEqual(panelGeometry.viewportHeight)
  expect(panelGeometry.scrollWidth).toBeLessThanOrEqual(panelGeometry.clientWidth + 1)
  expect(panelGeometry.overflowY).toMatch(/auto|scroll/)
  expect(panelGeometry.scrollHeight).toBeGreaterThan(panelGeometry.clientHeight)

  const gridColumnCounts = await appearancePanel
    .locator('[data-visual-grid]')
    .evaluateAll((grids) => {
      return Object.fromEntries(
        grids.map((grid) => {
          const gridName = (grid as HTMLElement).dataset.visualGrid ?? ''
          const columns = window
            .getComputedStyle(grid)
            .gridTemplateColumns
            .split(/\s+/)
            .filter(Boolean)
          return [gridName, columns.length]
        }),
      )
    })
  const expectedColumnCounts = {
    320: { presets: 1, themeMode: 2, componentSize: 2 },
    390: { presets: 2, themeMode: 2, componentSize: 3 },
    1024: { presets: 2, themeMode: 3, componentSize: 4 },
  } as const
  expect(gridColumnCounts.presets).toBe(expectedColumnCounts[viewportWidth].presets)
  expect(gridColumnCounts['theme-mode']).toBe(expectedColumnCounts[viewportWidth].themeMode)
  expect(gridColumnCounts['component-size']).toBe(expectedColumnCounts[viewportWidth].componentSize)

  const buttonCollisions = await appearancePanel.locator('button').evaluateAll((buttons) => {
    const visibleButtons = buttons
      .map((button) => {
        const style = window.getComputedStyle(button)
        const bounds = button.getBoundingClientRect()
        return {
          bounds,
          isVisible:
            style.display !== 'none'
            && style.visibility !== 'hidden'
            && bounds.width > 0
            && bounds.height > 0,
          label: button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '',
        }
      })
      .filter(button => button.isVisible)
    const collisions: Array<{ first: string, second: string }> = []

    for (const [firstIndex, firstButton] of visibleButtons.entries()) {
      for (const [secondIndex, secondButton] of visibleButtons.entries()) {
        if (secondIndex <= firstIndex)
          continue
        const horizontalOverlap
          = Math.min(firstButton.bounds.right, secondButton.bounds.right)
            - Math.max(firstButton.bounds.left, secondButton.bounds.left)
        const verticalOverlap
          = Math.min(firstButton.bounds.bottom, secondButton.bounds.bottom)
            - Math.max(firstButton.bounds.top, secondButton.bounds.top)
        if (horizontalOverlap > 1 && verticalOverlap > 1) {
          collisions.push({
            first: firstButton.label,
            second: secondButton.label,
          })
        }
      }
    }
    return collisions
  })
  expect(buttonCollisions, 'Appearance buttons must not intersect after copy expansion').toEqual([])

  const scrollResult = await appearancePanel.evaluate((element) => {
    const initialScrollTop = element.scrollTop
    element.scrollTop = element.scrollHeight
    const finalScrollTop = element.scrollTop
    element.scrollTop = initialScrollTop
    return { finalScrollTop, initialScrollTop }
  })
  expect(scrollResult.finalScrollTop).toBeGreaterThan(scrollResult.initialScrollTop)
}

for (const locale of locales) {
  for (const viewportWidth of viewportWidths) {
    test(`${locale} copy expansion remains usable at ${viewportWidth}px`, async ({ page }) => {
      await page.setViewportSize({ width: viewportWidth, height: 900 })
      await signInAsAdmin(page, locale)

      for (const pageCase of pageCases) {
        await waitForPageContent(page, pageCase)
        // AI modified: full route loads receive the same reduced-motion and devtools-free screenshot surface.
        await addStableVisualStyles(page)
        await inflateVisibleLabels(page)

        await expectDocumentWithoutHorizontalOverflow(page)
        await expectPageHeaderWithoutCollisions(page)
        await expectShellWithoutCollisions(page, viewportWidth)
        await expectPositiveInteractiveSizes(page)

        if (pageCase.id === 'users')
          await expectTableOverflowOwnedByViewport(page, viewportWidth)

        const snapshotCase = getVisualSnapshot(locale, viewportWidth, pageCase.id)
        if (snapshotCase)
          await expectVisualSnapshot(page, snapshotCase.snapshotName)
      }
    })
  }
}

for (const viewportWidth of [320, 390, 1024] as const) {
  test(`English Appearance Sheet survives 150% copy expansion at ${viewportWidth}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewportWidth, height: 900 })
    await signInAsAdmin(page, 'en-US')
    await waitForPageContent(page, pageCases[0])
    await addStableVisualStyles(page)

    const appearancePanel = await openExpandedAppearancePanel(page)
    await expectAppearancePanelGeometry(page, appearancePanel, viewportWidth)
  })
}

test('unbroken identifiers, long emails, filenames, and errors remain readable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signInAsAdmin(page, 'en-US')
  await waitForPageContent(page, pageCases[0])
  await addStableVisualStyles(page)
  await addLongContentFixtureRegion(page)
  await inflateVisibleLabels(page)

  await expectLongContentFixturesToRemainReadable(page)
  await expectDocumentWithoutHorizontalOverflow(page)
})
