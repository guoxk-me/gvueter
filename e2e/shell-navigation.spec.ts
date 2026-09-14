import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

type AppLocale = 'en-US' | 'zh-CN'
type LayoutMode
  = | 'header-hybrid-header-first'
    | 'header-hybrid-sidebar-first'
    | 'mixed'
    | 'sidebar'
    | 'sidebar-hybrid-header-first'
    | 'top'
type SidebarDefault = 'collapsed' | 'expanded'
type ThemeMode = 'dark' | 'light'
type UiDensity = 'compact' | 'standard'

interface ShellGeometry {
  contextBottomBorderWidth: number
  contextDirectChildBoundaryCount: number
  documentClientWidth: number
  documentScrollWidth: number
  railCount: number
  rightBoundaryOwnerCount: number
  verticalNavigationWidths: number[]
}

interface TopNavigationGeometry {
  actionControlCount: number
  intersectionCount: number
  isMoreVisible: boolean
  isWithinHeader: boolean
  visibleRootCount: number
}

interface ResponsivePageGeometry {
  documentClientWidth: number
  documentScrollWidth: number
  isHeadingUncovered: boolean
  isHeadingWithinMain: boolean
  mainClientWidth: number
  mainScrollWidth: number
  visibleDesktopNavigationCount: number
  visibleMobileNavigationCount: number
}

interface ThemeDensityGeometry {
  bodyBackgroundColor: string
  searchControlHeight: number
  tableHeadHeight: number
  tableRowHeight: number
}

interface MotionDurations {
  animationDuration: string
  transitionDuration: string
}

interface SidebarMotionFrame {
  bodyLeft: number
  documentClientWidth: number
  documentScrollWidth: number
  elapsedMilliseconds: number
  sidebarRight: number
  sidebarWidth: number
}

const layouts = [
  {
    id: 'sidebar',
    canCollapse: true,
    expandedRails: 0,
    collapsedRails: 1,
    expandedWidths: [256],
    collapsedWidths: [68],
  },
  {
    id: 'top',
    canCollapse: false,
    expandedRails: 0,
    collapsedRails: 0,
    expandedWidths: [],
    collapsedWidths: [],
  },
  {
    id: 'mixed',
    canCollapse: true,
    expandedRails: 1,
    collapsedRails: 1,
    expandedWidths: [68, 224],
    collapsedWidths: [68],
  },
  {
    id: 'sidebar-hybrid-header-first',
    canCollapse: true,
    expandedRails: 0,
    collapsedRails: 1,
    expandedWidths: [256],
    collapsedWidths: [68],
  },
  {
    id: 'header-hybrid-sidebar-first',
    canCollapse: false,
    expandedRails: 1,
    collapsedRails: 1,
    expandedWidths: [68],
    collapsedWidths: [68],
  },
  {
    id: 'header-hybrid-header-first',
    canCollapse: true,
    expandedRails: 0,
    collapsedRails: 1,
    expandedWidths: [224],
    collapsedWidths: [68],
  },
] as const satisfies ReadonlyArray<{
  id: LayoutMode
  canCollapse: boolean
  expandedRails: number
  collapsedRails: number
  expandedWidths: readonly number[]
  collapsedWidths: readonly number[]
}>

const responsiveWidths = [390, 768, 1024, 1280, 1440] as const

function durationToMilliseconds(durationList: string): number {
  let longestDuration = 0
  for (const duration of durationList.split(',')) {
    const trimmedDuration = duration.trim()
    const durationValue = Number.parseFloat(trimmedDuration)
    if (!Number.isFinite(durationValue))
      continue
    const durationMilliseconds = trimmedDuration.endsWith('ms')
      ? durationValue
      : durationValue * 1000
    longestDuration = Math.max(longestDuration, durationMilliseconds)
  }
  return longestDuration
}

function longestMotionDuration(durations: MotionDurations): number {
  return Math.max(
    durationToMilliseconds(durations.animationDuration),
    durationToMilliseconds(durations.transitionDuration),
  )
}

async function signInAsAdmin(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const locale = localStorage.getItem('locale') ?? 'en-US'
    const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    localStorage.setItem('locale', locale)
    localStorage.setItem('appearance', JSON.stringify({ ...storedAppearance, locale }))
  })
  await page.goto('/login')
  const captchaChallenge = page
    .locator('[aria-label]')
    .filter({ hasText: /\d+\s*\+\s*\d+\s*=\s*\?/ })
    .first()
  await expect(captchaChallenge).toBeVisible()
  const operands = (await captchaChallenge.textContent())?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.getByRole('textbox', { name: 'Email' }).fill('admin@example.com')
  await page.locator('input[type="password"]').fill('admin123')
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('.admin-layout')).toBeVisible()
}

async function useShellSettings(
  page: Page,
  settings: {
    layout: LayoutMode
    locale?: AppLocale
    sidebarDefault?: SidebarDefault
  },
): Promise<void> {
  const locale = settings.locale ?? 'en-US'
  const sidebarDefault = settings.sidebarDefault ?? 'expanded'
  await page.evaluate(
    ({ layout, locale: nextLocale, sidebarDefault: nextSidebarDefault }) => {
      const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
        string,
        unknown
      >
      localStorage.setItem('locale', nextLocale)
      localStorage.setItem(
        'appearance',
        JSON.stringify({
          ...storedAppearance,
          isBreadcrumbVisible: true,
          isTabsVisible: true,
          layout,
          locale: nextLocale,
          sidebarDefault: nextSidebarDefault,
        }),
      )
    },
    { layout: settings.layout, locale, sidebarDefault },
  )
  // AI modified: render assertions own readiness after the refreshed document commits.
  await page.reload({ waitUntil: 'commit' })
  await expect(page.locator(`.admin-layout[data-layout="${settings.layout}"]`)).toBeVisible()
  await expect(page.locator('[data-layout-region="context-bar"]')).toBeVisible()
}

async function useThemeDensitySettings(
  page: Page,
  settings: { density: UiDensity, themeMode: ThemeMode },
): Promise<void> {
  // AI modified: document load can precede Mock/Vue startup; refresh only a mounted Shell.
  await expect(page.locator('.admin-layout')).toBeVisible()
  await page.evaluate(({ density, themeMode }) => {
    const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    const componentSize = density === 'compact' ? 'sm' : 'default'
    // AI modified: reload acceptance verifies AppSettings without depending on its legacy mirror key.
    localStorage.setItem(
      'appearance',
      JSON.stringify({ ...storedAppearance, componentSize, themeMode }),
    )
  }, settings)
  await page.reload({ waitUntil: 'commit' })
  // AI modified: theme attributes initialize before Vue remounts, so wait for the shell too.
  await expect(page.locator('.admin-layout')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', settings.themeMode)
  await expect(page.locator('html')).toHaveAttribute(
    'data-component-size',
    settings.density === 'compact' ? 'sm' : 'default',
  )
}

async function readShellGeometry(page: Page): Promise<ShellGeometry> {
  return page.evaluate(() => {
    const contextBar = document.querySelector<HTMLElement>('[data-layout-region="context-bar"]')
    // AI modified: the semantic context-bar aside is horizontal chrome, not a desktop rail.
    const verticalRegions = [
      ...document.querySelectorAll<HTMLElement>(
        'aside[data-layout-region="primary-navigation"], aside[data-layout-region="secondary-navigation"]',
      ),
    ]
    const verticalNavigationWidths = verticalRegions
      .map(region => region.getBoundingClientRect().width)
      .filter(width => width > 0.5)
    const rightBoundaryOwnerCount = verticalRegions.filter((region) => {
      const styles = getComputedStyle(region)
      return (
        region.getBoundingClientRect().width > 0.5
        && styles.borderRightStyle !== 'none'
        && Number.parseFloat(styles.borderRightWidth) > 0
      )
    }).length
    const contextStyles = contextBar ? getComputedStyle(contextBar) : undefined
    const contextDirectChildBoundaryCount = contextBar
      ? [...contextBar.children].filter((child) => {
          const styles = getComputedStyle(child)
          return (
            styles.borderBottomStyle !== 'none' && Number.parseFloat(styles.borderBottomWidth) > 0
          )
        }).length
      : 0

    return {
      contextBottomBorderWidth: contextStyles
        ? Number.parseFloat(contextStyles.borderBottomWidth)
        : 0,
      contextDirectChildBoundaryCount,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      railCount: verticalNavigationWidths.filter(width => width >= 60 && width <= 80).length,
      rightBoundaryOwnerCount,
      verticalNavigationWidths,
    }
  })
}

async function readResponsivePageGeometry(page: Page): Promise<ResponsivePageGeometry> {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('#admin-main-content')
    const heading = main?.querySelector<HTMLElement>('h1')
    const mainRectangle = main?.getBoundingClientRect()
    const headingRectangle = heading?.getBoundingClientRect()
    const visibleMobileNavigationCount = [
      ...document.querySelectorAll<HTMLElement>('[aria-controls="admin-mobile-navigation"]'),
    ].filter((control) => {
      const rectangle = control.getBoundingClientRect()
      return rectangle.width > 0.5 && rectangle.height > 0.5
    }).length
    const visibleDesktopNavigationCount = [
      ...document.querySelectorAll<HTMLElement>(
        'aside[data-layout-region="primary-navigation"] nav, aside[data-layout-region="secondary-navigation"] nav, [data-layout-region="secondary-navigation"]:not(aside) nav, [data-top-navigation]',
      ),
    ].filter((navigation) => {
      const rectangle = navigation.getBoundingClientRect()
      return rectangle.width > 0.5 && rectangle.height > 0.5
    }).length
    const headingHitTarget = headingRectangle
      ? document.elementFromPoint(
          Math.min(headingRectangle.right - 1, headingRectangle.left + 8),
          Math.min(headingRectangle.bottom - 1, headingRectangle.top + 8),
        )
      : null

    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      isHeadingUncovered: Boolean(
        heading && headingHitTarget && heading.contains(headingHitTarget),
      ),
      isHeadingWithinMain: Boolean(
        mainRectangle
        && headingRectangle
        && headingRectangle.left >= mainRectangle.left - 0.5
        && headingRectangle.right <= mainRectangle.right + 0.5
        && headingRectangle.top >= mainRectangle.top - 0.5,
      ),
      mainClientWidth: main?.clientWidth ?? 0,
      mainScrollWidth: main?.scrollWidth ?? 0,
      visibleDesktopNavigationCount,
      visibleMobileNavigationCount,
    }
  })
}

async function readThemeDensityGeometry(page: Page): Promise<ThemeDensityGeometry> {
  const searchControl = page.getByRole('searchbox', { name: 'Search' })
  const tableHead = page.getByRole('columnheader').first()
  const tableRow = page.locator('tbody tr[data-row-id]').first()
  await expect(searchControl).toBeVisible()
  await expect(tableHead).toBeVisible()
  await expect(tableRow).toBeVisible()

  // AI modified: measure the exact visible locators instead of whichever matching node appears first.
  const [bodyBackgroundColor, searchControlHeight, tableHeadHeight, tableRowHeight]
    = await Promise.all([
      page.evaluate(() => getComputedStyle(document.body).backgroundColor),
      searchControl.evaluate(element => element.getBoundingClientRect().height),
      tableHead.evaluate(element => element.getBoundingClientRect().height),
      tableRow.evaluate(element => element.getBoundingClientRect().height),
    ])

  return { bodyBackgroundColor, searchControlHeight, tableHeadHeight, tableRowHeight }
}

async function captureRouteTransitionDuration(page: Page, targetPath: string): Promise<number> {
  await page.evaluate(() => {
    const root = document.documentElement
    root.dataset.routeTransitionDuration = ''
    const main = document.querySelector('#admin-main-content')
    if (!main)
      throw new Error('The admin main content was not available for transition observation')

    const observer = new MutationObserver(() => {
      const transitioningRoute = main.querySelector<HTMLElement>(
        '.admin-route-fade-enter-active, .admin-route-fade-leave-active, .admin-route-slide-enter-active, .admin-route-slide-leave-active',
      )
      if (!transitioningRoute)
        return
      root.dataset.routeTransitionDuration = getComputedStyle(transitioningRoute).transitionDuration
      observer.disconnect()
    })
    observer.observe(main, { attributes: true, childList: true, subtree: true })
  })

  await page.locator(`a[href="${targetPath}"]:visible`).first().click()
  await expect(page).toHaveURL(targetPath)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.routeTransitionDuration ?? ''))
    .not
    .toBe('')
  const duration = await page.evaluate(
    () => document.documentElement.dataset.routeTransitionDuration ?? '0s',
  )
  return durationToMilliseconds(duration)
}

async function readSheetMotion(page: Page): Promise<MotionDurations> {
  const sheet = page.locator('[data-slot="sheet-content"]:visible').last()
  await expect(sheet).toBeVisible()
  return sheet.evaluate((element) => {
    const styles = getComputedStyle(element)
    return {
      animationDuration: styles.animationDuration,
      transitionDuration: styles.transitionDuration,
    }
  })
}

async function armSidebarMotionTrace(page: Page, finalSidebarWidth: number): Promise<void> {
  await page.evaluate(
    ({ finalWidth }) => {
      const root = document.querySelector<HTMLElement>('.admin-layout')
      const sidebar = document.querySelector<HTMLElement>(
        'aside[data-layout-region="primary-navigation"]',
      )
      const body = document.querySelector<HTMLElement>('.admin-layout__body')
      if (!root || !sidebar || !body)
        throw new Error('The sidebar motion surface was not available')

      const initialSidebarWidth = sidebar.getBoundingClientRect().width
      const initialSidebarState = root.dataset.sidebarState
      root.dataset.sidebarMotionDone = 'false'
      root.dataset.sidebarMotionTrace = ''

      const frames: SidebarMotionFrame[] = []
      let hasLeftInitialWidth = false
      let stableFrameCount = 0
      let startedAt: number | undefined

      const recordFrame = (timestamp: number): void => {
        startedAt ??= timestamp
        const sidebarRectangle = sidebar.getBoundingClientRect()
        const bodyRectangle = body.getBoundingClientRect()
        const elapsedMilliseconds = timestamp - startedAt
        const sidebarWidth = sidebarRectangle.width
        hasLeftInitialWidth ||= Math.abs(sidebarWidth - initialSidebarWidth) > 0.75
        stableFrameCount
          = hasLeftInitialWidth && Math.abs(sidebarWidth - finalWidth) <= 0.75
            ? stableFrameCount + 1
            : 0
        frames.push({
          bodyLeft: bodyRectangle.left,
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          elapsedMilliseconds,
          sidebarRight: sidebarRectangle.right,
          sidebarWidth,
        })

        if (stableFrameCount >= 3 || elapsedMilliseconds >= 1_200) {
          root.dataset.sidebarMotionDone = 'true'
          root.dataset.sidebarMotionTrace = JSON.stringify(frames)
          return
        }
        requestAnimationFrame(recordFrame)
      }

      // AI modified: start at the committed state change so the trace includes real animation frames.
      const sidebarStateObserver = new MutationObserver(() => {
        if (root.dataset.sidebarState === initialSidebarState)
          return
        sidebarStateObserver.disconnect()
        requestAnimationFrame(recordFrame)
      })
      sidebarStateObserver.observe(root, {
        attributeFilter: ['data-sidebar-state'],
        attributes: true,
      })
    },
    { finalWidth: finalSidebarWidth },
  )
}

async function readSidebarMotionTrace(page: Page): Promise<SidebarMotionFrame[]> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.querySelector<HTMLElement>('.admin-layout')?.dataset.sidebarMotionDone
            ?? 'false',
        ),
      { timeout: 2_000 },
    )
    .toBe('true')

  return page.evaluate(() => {
    const serializedFrames
      = document.querySelector<HTMLElement>('.admin-layout')?.dataset.sidebarMotionTrace
    if (!serializedFrames)
      throw new Error('The sidebar motion trace was empty')
    return JSON.parse(serializedFrames) as SidebarMotionFrame[]
  })
}

function expectNavigationWidths(
  actualWidths: readonly number[],
  expectedWidths: readonly number[],
): void {
  expect(actualWidths).toHaveLength(expectedWidths.length)
  for (const [index, expectedWidth] of expectedWidths.entries())
    expect(Math.abs((actualWidths[index] ?? 0) - expectedWidth)).toBeLessThanOrEqual(1)
}

function expectSidebarMotionGeometry(
  frames: readonly SidebarMotionFrame[],
  finalSidebarWidth: number,
): void {
  expect(frames.length).toBeGreaterThanOrEqual(3)
  for (const frame of frames) {
    expect(Math.abs(frame.sidebarRight - frame.bodyLeft)).toBeLessThanOrEqual(1)
    expect(frame.documentScrollWidth).toBeLessThanOrEqual(frame.documentClientWidth)
  }
  const finalFrame = frames.at(-1)
  expect(finalFrame).toBeDefined()
  expect(Math.abs((finalFrame?.sidebarWidth ?? 0) - finalSidebarWidth)).toBeLessThanOrEqual(1)
}

function expectOnlySidebarEndpointWidths(
  frames: readonly SidebarMotionFrame[],
  initialSidebarWidth: number,
  finalSidebarWidth: number,
): void {
  for (const frame of frames) {
    const distanceFromEndpoint = Math.min(
      Math.abs(frame.sidebarWidth - initialSidebarWidth),
      Math.abs(frame.sidebarWidth - finalSidebarWidth),
    )
    expect(distanceFromEndpoint).toBeLessThanOrEqual(1)
  }
}

function expectStableShellGeometry(geometry: ShellGeometry, expectedRailCount: number): void {
  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth)
  expect(geometry.railCount).toBe(expectedRailCount)
  expect(geometry.railCount).toBeLessThanOrEqual(1)
  expect(geometry.rightBoundaryOwnerCount).toBe(
    geometry.verticalNavigationWidths.length > 0 ? 1 : 0,
  )
  expect(geometry.contextBottomBorderWidth).toBeGreaterThan(0)
  expect(geometry.contextDirectChildBoundaryCount).toBe(0)
}

async function readTopNavigationGeometry(page: Page): Promise<TopNavigationGeometry> {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-layout-region="header"]')
    const topNavigation = document.querySelector<HTMLElement>('[data-top-navigation]')
    const actionStrip = header?.querySelector<HTMLElement>(':scope > div:last-child')
    const visibleRoots = topNavigation
      ? [...topNavigation.querySelectorAll<HTMLElement>(':scope > div:first-child > nav > ul > li')]
      : []
    const moreButton = topNavigation?.querySelector<HTMLElement>('[data-top-navigation-more]')
    const actionControls = actionStrip
      ? [
          ...actionStrip.querySelectorAll<HTMLElement>(
            ':scope > button, :scope > a, :scope > div > button',
          ),
        ].filter(control => control.getBoundingClientRect().width > 0)
      : []
    const searchControl = actionControls[0]
    const notificationControl = actionControls.find(
      control =>
        control instanceof HTMLAnchorElement
        && new URL(control.href).pathname === '/message-center',
    )
    const accountControl = [...actionControls]
      .reverse()
      .find(control => control instanceof HTMLButtonElement)
    const trackedActions = [searchControl, notificationControl, accountControl].filter(
      (control): control is HTMLElement => Boolean(control),
    )
    const navigationControls = [
      ...visibleRoots.flatMap(root => [
        ...root.querySelectorAll<HTMLElement>(':scope > a, :scope > button'),
      ]),
      ...(moreButton ? [moreButton] : []),
    ]

    function rectanglesIntersect(left: DOMRect, right: DOMRect): boolean {
      const tolerance = 0.5
      return (
        left.right > right.left + tolerance
        && left.left < right.right - tolerance
        && left.bottom > right.top + tolerance
        && left.top < right.bottom - tolerance
      )
    }

    const intersectionCount = navigationControls.reduce(
      (count, navigationControl) =>
        count
        + trackedActions.filter(actionControl =>
          rectanglesIntersect(
            navigationControl.getBoundingClientRect(),
            actionControl.getBoundingClientRect(),
          ),
        ).length,
      0,
    )
    const headerRectangle = header?.getBoundingClientRect()
    const isWithinHeader
      = Boolean(headerRectangle)
        && [...navigationControls, ...trackedActions].every((control) => {
          const rectangle = control.getBoundingClientRect()
          return (
            rectangle.left >= headerRectangle!.left - 0.5
            && rectangle.right <= headerRectangle!.right + 0.5
          )
        })

    return {
      actionControlCount: actionControls.length,
      intersectionCount,
      isMoreVisible: Boolean(moreButton && moreButton.getBoundingClientRect().width > 0),
      isWithinHeader,
      visibleRootCount: visibleRoots.length,
    }
  })
}

async function expectTopNavigationSettled(page: Page): Promise<TopNavigationGeometry> {
  await expect.poll(async () => (await readTopNavigationGeometry(page)).intersectionCount).toBe(0)
  const geometry = await readTopNavigationGeometry(page)
  expect(geometry.actionControlCount).toBeGreaterThanOrEqual(5)
  expect(geometry.isWithinHeader).toBe(true)
  return geometry
}

async function visiblePopover(page: Page): Promise<Locator> {
  const popover = page.locator('[data-slot="popover-content"]:visible').last()
  await expect(popover).toBeVisible()
  return popover
}

test('keeps all layout contracts on one rail and one context boundary when collapsed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signInAsAdmin(page)

  for (const layout of layouts) {
    await useShellSettings(page, {
      layout: layout.id,
      sidebarDefault: 'expanded',
    })
    // AI modified: WebKit can expose the hydrated shell before its persisted layout width settles.
    await expect
      .poll(async () =>
        (await readShellGeometry(page)).verticalNavigationWidths.map(width => Math.round(width)),
      )
      .toEqual(layout.expandedWidths)
    const expandedGeometry = await readShellGeometry(page)
    expectStableShellGeometry(expandedGeometry, layout.expandedRails)
    expectNavigationWidths(expandedGeometry.verticalNavigationWidths, layout.expandedWidths)

    const collapseControl = page.getByRole('button', {
      name: 'Collapse sidebar',
      exact: true,
    })
    await expect(collapseControl).toHaveCount(layout.canCollapse ? 1 : 0)
    if (!layout.canCollapse)
      continue

    // AI modified: this gate checks the user-facing collapse entry and the resulting geometry together.
    await collapseControl.click()
    await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible()
    await expect
      .poll(async () =>
        (await readShellGeometry(page)).verticalNavigationWidths.map(width => Math.round(width)),
      )
      .toEqual(layout.collapsedWidths)
    const collapsedGeometry = await readShellGeometry(page)
    expectStableShellGeometry(collapsedGeometry, layout.collapsedRails)
    expectNavigationWidths(collapsedGeometry.verticalNavigationWidths, layout.collapsedWidths)

    if (layout.id === 'mixed') {
      const secondaryWidth = await page
        .locator('aside[data-layout-region="secondary-navigation"]')
        .evaluate(element => element.getBoundingClientRect().width)
      expect(secondaryWidth).toBeLessThanOrEqual(1)
    }
  }
})

test('animates sidebar collapse without breaking shell geometry', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await signInAsAdmin(page)
  await useShellSettings(page, {
    layout: 'sidebar',
    locale: 'en-US',
    sidebarDefault: 'expanded',
  })

  await armSidebarMotionTrace(page, 68)
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  const collapseFrames = await readSidebarMotionTrace(page)
  expectSidebarMotionGeometry(collapseFrames, 68)
  for (const [index, frame] of collapseFrames.entries()) {
    if (index === 0)
      continue
    expect(frame.sidebarWidth).toBeLessThanOrEqual(
      (collapseFrames[index - 1]?.sidebarWidth ?? 0) + 1,
    )
  }
  await expect(page.locator('.admin-layout')).toHaveAttribute('data-sidebar-state', 'collapsed')
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible()
})

test('switches sidebar endpoints without interpolation when motion is reduced', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signInAsAdmin(page)
  await useShellSettings(page, {
    layout: 'sidebar',
    locale: 'en-US',
    sidebarDefault: 'expanded',
  })
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  )
  const initialSidebarWidth = await page
    .locator('aside[data-layout-region="primary-navigation"]')
    .evaluate(element => element.getBoundingClientRect().width)
  await armSidebarMotionTrace(page, 68)
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click()
  const reducedMotionFrames = await readSidebarMotionTrace(page)
  expectSidebarMotionGeometry(reducedMotionFrames, 68)
  expectOnlySidebarEndpointWidths(reducedMotionFrames, initialSidebarWidth, 68)
  await expect(page.locator('.admin-layout')).toHaveAttribute('data-sidebar-state', 'collapsed')
})

test('keeps rapid sidebar keyboard toggles reversible and focused', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await signInAsAdmin(page)
  await useShellSettings(page, {
    layout: 'sidebar',
    locale: 'en-US',
    sidebarDefault: 'expanded',
  })

  const collapseControl = page.getByRole('button', { name: 'Collapse sidebar', exact: true })
  await collapseControl.press('Space')
  await expect(page.locator('.admin-layout')).toHaveAttribute('data-sidebar-state', 'collapsed')
  const expandControl = page.getByRole('button', { name: 'Expand sidebar', exact: true })
  await expect(expandControl).toBeVisible()
  await expect(expandControl).toBeFocused()
  await expandControl.press('Space')

  await expect(page.locator('.admin-layout')).toHaveAttribute('data-sidebar-state', 'expanded')
  await expect(collapseControl).toBeVisible()
  await expect(collapseControl).toBeFocused()
  await expect
    .poll(async () => (await readShellGeometry(page)).verticalNavigationWidths)
    .toEqual([256])
})

test('uses one mobile navigation entry below 1024 and desktop navigation at 1024', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await signInAsAdmin(page)
  await useShellSettings(page, { layout: 'sidebar' })

  for (const width of [768, 1023]) {
    await page.setViewportSize({ width, height: 900 })
    const mobileNavigation = page.getByRole('button', { name: 'Navigation', exact: true })
    await expect(mobileNavigation).toBeVisible()
    await expect(page.locator('aside[data-layout-region="primary-navigation"]')).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Navigation' })).toHaveCount(0)
    const geometry = await readShellGeometry(page)
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth)
  }

  await page.setViewportSize({ width: 768, height: 900 })
  await page.getByRole('button', { name: 'Navigation', exact: true }).click()
  const mobileSheet = page.getByRole('dialog', { name: 'Navigation' })
  await expect(mobileSheet).toBeVisible()
  await mobileSheet.getByRole('link', { name: 'Component Center', exact: true }).click()
  await expect(page).toHaveURL('/components')
  await expect(mobileSheet).toBeHidden()

  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(page.getByRole('button', { name: 'Navigation', exact: true })).toBeHidden()
  await expect(page.locator('aside[data-layout-region="primary-navigation"]')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigation' })).toHaveCount(1)

  await useShellSettings(page, { layout: 'top' })
  await expect(page.locator('[data-top-navigation]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Navigation', exact: true })).toBeHidden()
})

test('keeps a collapsed four-level branch mouse and keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signInAsAdmin(page)

  await useShellSettings(page, {
    layout: 'sidebar',
    sidebarDefault: 'collapsed',
  })
  const primaryNavigation = page.locator('aside[data-layout-region="primary-navigation"]')
  const administrationTrigger = primaryNavigation.getByRole('button', {
    name: 'Administration',
    exact: true,
  })

  await administrationTrigger.focus()
  await page.keyboard.press('Enter')
  await visiblePopover(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-slot="popover-content"]:visible')).toHaveCount(0)
  await expect(administrationTrigger).toBeFocused()

  await administrationTrigger.click()
  const flyout = await visiblePopover(page)
  await flyout.locator('[data-navigation-node-id="security-center"] > button').click()
  await flyout.locator('[data-navigation-node-id="audit-controls"] > button').click()
  await flyout.locator('[data-navigation-node-id="audit-events"] > a').click()
  await expect(page).toHaveURL('/system-config/audit-events')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // AI modified: a full refresh must restore every active ancestor before the flyout is opened again.
  await page.reload({ waitUntil: 'commit' })
  await expect(page).toHaveURL('/system-config/audit-events')
  const restoredAdministration = primaryNavigation.locator(
    '[data-navigation-node-id="administration"][data-navigation-active="true"]',
  )
  await expect(restoredAdministration).toBeVisible()
  await restoredAdministration.locator(':scope > button').click()
  const restoredFlyout = await visiblePopover(page)
  for (const nodeId of ['security-center', 'audit-controls', 'audit-events']) {
    await expect(
      restoredFlyout.locator(
        `[data-navigation-node-id="${nodeId}"][data-navigation-active="true"]`,
      ),
    ).toBeVisible()
  }
})

test('degrades translated top navigation from full to More without covering header actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 })
  await signInAsAdmin(page)

  for (const locale of ['en-US', 'zh-CN'] as const) {
    await useShellSettings(page, { layout: 'top', locale })
    const rootCounts: number[] = []
    const moreStates: boolean[] = []

    for (const width of [1920, 1440, 1280, 1024]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(page.locator('[data-top-navigation]')).toBeVisible()
      // AI modified: let ResizeObserver commit translated overflow before reading navigation geometry.
      await page.evaluate(
        () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
      )
      // AI modified: wait for the two contractual overflow endpoints, not only an intermediate collision-free frame.
      if (width === 1920)
        await expect(page.locator('[data-top-navigation-more]')).toBeHidden()
      if (width === 1024)
        await expect(page.locator('[data-top-navigation-more]')).toBeVisible()
      const geometry = await expectTopNavigationSettled(page)
      rootCounts.push(geometry.visibleRootCount)
      moreStates.push(geometry.isMoreVisible)
      const shellGeometry = await readShellGeometry(page)
      expect(shellGeometry.documentScrollWidth).toBeLessThanOrEqual(
        shellGeometry.documentClientWidth,
      )
    }

    expect(moreStates[0]).toBe(false)
    expect(moreStates.at(-1)).toBe(true)
    expect(rootCounts[0]).toBeGreaterThan(rootCounts.at(-1) ?? 0)
    for (let index = 1; index < rootCounts.length; index += 1)
      expect(rootCounts[index]).toBeLessThanOrEqual(rootCounts[index - 1] ?? 0)

    if (locale === 'en-US') {
      const moreButton = page.locator('[data-top-navigation-more]')
      await moreButton.click()
      const moreNavigation = await visiblePopover(page)
      await moreNavigation.getByRole('link', { name: 'System Monitoring', exact: true }).click()
      await expect(page).toHaveURL('/monitoring')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  }
})

test('keeps the active top-navigation branch closed until the user opens it', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 })
  await signInAsAdmin(page)
  await useShellSettings(page, { layout: 'top' })
  // AI modified: Firefox+MSW can defer lifecycle events after commit; the heading assertion owns readiness.
  await page.goto('/users', { waitUntil: 'commit' })
  await expect(page.getByRole('heading', { name: 'User Management', level: 1 })).toBeVisible()

  const topNavigation = page.locator('[data-top-navigation]')
  const administrationTrigger = topNavigation.getByRole('button', {
    name: 'Administration',
    exact: true,
  })
  const userManagementLink = topNavigation.getByRole('link', {
    name: 'User Management',
    exact: true,
  })

  // AI modified: an active route styles its branch without opening a content-covering flyout.
  await expect(administrationTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(userManagementLink).toBeHidden()
  await administrationTrigger.click()
  await expect(administrationTrigger).toHaveAttribute('aria-expanded', 'true')
  await expect(userManagementLink).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(administrationTrigger).toHaveAttribute('aria-expanded', 'false')
})

test('keeps every layout and locale stable across the responsive acceptance matrix', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await signInAsAdmin(page)

  // AI modified: one browser gate exercises the complete Shell matrix against measurable geometry.
  for (const locale of ['zh-CN', 'en-US'] as const) {
    for (const layout of layouts) {
      await useShellSettings(page, {
        layout: layout.id,
        locale,
        sidebarDefault: 'expanded',
      })
      await expect(page.locator('html')).toHaveAttribute('lang', locale)

      for (const width of responsiveWidths) {
        await page.setViewportSize({ width, height: 900 })
        await expect
          .poll(async () => {
            const geometry = await readResponsivePageGeometry(page)
            return (
              geometry.documentScrollWidth <= geometry.documentClientWidth
              && geometry.mainScrollWidth <= geometry.mainClientWidth
              && geometry.isHeadingWithinMain
              && geometry.isHeadingUncovered
            )
          })
          .toBe(true)

        const pageGeometry = await readResponsivePageGeometry(page)
        expect(pageGeometry.visibleMobileNavigationCount).toBe(width < 1024 ? 1 : 0)
        expect(pageGeometry.visibleDesktopNavigationCount).toBeGreaterThanOrEqual(
          width < 1024 ? 0 : 1,
        )
        if (width < 1024)
          expect(pageGeometry.visibleDesktopNavigationCount).toBe(0)

        const shellGeometry = await readShellGeometry(page)
        expectStableShellGeometry(shellGeometry, width < 1024 ? 0 : layout.expandedRails)

        if (width >= 1024 && (await page.locator('[data-top-navigation]').isVisible()))
          await expectTopNavigationSettled(page)
      }
    }
  }
})

test('projects every applicable appearance setting onto a visible Shell target', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signInAsAdmin(page)
  await page.getByRole('button', { name: 'Appearance' }).click()
  const appearancePanel = page.getByRole('dialog', { name: 'Appearance' })
  await expect(appearancePanel.getByText('Sticky Header', { exact: true })).toHaveCount(0)
  await expect(appearancePanel.getByRole('group', { name: 'Sidebar Default' })).toBeVisible()
  await appearancePanel.getByRole('button', { name: /^Top Nav\b/ }).click()
  await expect(appearancePanel.getByRole('group', { name: 'Sidebar Default' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await page.evaluate(() => {
    const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    localStorage.setItem(
      'appearance',
      JSON.stringify({
        ...storedAppearance,
        contentWidth: 'boxed',
        hasBreadcrumbIcon: true,
        isBreadcrumbVisible: true,
        isFooterVisible: true,
        isTabsVisible: true,
        isWatermarkVisible: true,
        layout: 'sidebar',
        pageTransition: 'none',
        sidebarDefault: 'collapsed',
        tabStyle: 'minimal',
      }),
    )
  })
  await page.reload({ waitUntil: 'commit' })

  // AI modified: each persisted option is accepted only when its named render target changes too.
  await expect(page.locator('html')).toHaveAttribute('data-content-width', 'boxed')
  await expect(page.locator('html')).toHaveAttribute('data-page-transition', 'none')
  await expect(page.locator('.admin-layout')).toHaveAttribute('data-sidebar-state', 'collapsed')
  await expect(page.locator('[data-layout-region="route-content"]')).toHaveClass(/max-w-screen-xl/)
  await expect(page.locator('[data-admin-watermark]')).toHaveCount(1)
  await expect(page.locator('[data-context-row="breadcrumb"]')).toBeVisible()
  await expect(page.locator('[data-breadcrumb-home-icon]')).toHaveCount(1)
  await expect(page.locator('[data-context-row="tabs"] [data-tab-style]')).toHaveAttribute(
    'data-tab-style',
    'minimal',
  )
  await expect(page.locator('[data-admin-footer]')).toBeVisible()

  await page.evaluate(() => {
    const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    localStorage.setItem(
      'appearance',
      JSON.stringify({
        ...storedAppearance,
        contentWidth: 'fluid',
        hasBreadcrumbIcon: false,
        isBreadcrumbVisible: false,
        isFooterVisible: false,
        isTabsVisible: false,
        isWatermarkVisible: false,
        pageTransition: 'fade',
        sidebarDefault: 'expanded',
      }),
    )
  })
  await page.reload({ waitUntil: 'commit' })
  await expect(page.locator('[data-layout-region="route-content"]')).not.toHaveClass(
    /max-w-screen-xl/,
  )
  await expect(page.locator('.admin-layout')).toHaveAttribute('data-sidebar-state', 'expanded')
  await expect(page.locator('[data-admin-watermark]')).toHaveCount(0)
  await expect(page.locator('[data-layout-region="context-bar"]')).toHaveCount(0)
  await expect(page.locator('[data-admin-footer]')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-page-transition', 'fade')
})

test('moves keyboard focus through the skip link into the active route', async ({
  browserName,
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signInAsAdmin(page)
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur()
  })
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('BODY')

  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  // AI modified: Safari uses Option+Tab for links unless Full Keyboard Access is enabled.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#admin-main-content')).toBeFocused()
})

test('keeps representative native and composite controls at least 44px on coarse pointers', async ({
  browser,
}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL
  if (typeof baseURL !== 'string')
    throw new Error('The browser quality gate requires a configured base URL')

  const touchContext = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  })
  const touchPage = await touchContext.newPage()
  try {
    await signInAsAdmin(touchPage)
    expect(await touchPage.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
    await touchPage.goto('/users')

    const touchTargets = [
      touchPage.getByRole('button', { name: 'Navigation', exact: true }),
      touchPage.getByRole('button', { name: 'Appearance', exact: true }),
      touchPage.getByRole('searchbox', { name: 'Search' }),
      touchPage.getByRole('button', { name: 'Search', exact: true }),
    ]
    for (const touchTarget of touchTargets) {
      await expect(touchTarget).toBeVisible()
      const targetSize = await touchTarget.evaluate((element) => {
        const rectangle = element.getBoundingClientRect()
        return { height: rectangle.height, width: rectangle.width }
      })
      const accessibleName
        = (await touchTarget.getAttribute('aria-label'))
          ?? (await touchTarget.getAttribute('placeholder'))
          ?? (await touchTarget.textContent())
      expect(targetSize.height, `${accessibleName} height`).toBeGreaterThanOrEqual(44)
      expect(targetSize.width, `${accessibleName} width`).toBeGreaterThanOrEqual(44)
    }

    // AI modified: the mobile gate completes a real search and row-selection workflow at 390px.
    await touchPage.getByRole('searchbox', { name: 'Search' }).fill('admin@example.com')
    await touchPage.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(touchPage.getByRole('cell', { name: /admin@example\.com/ })).toBeVisible()
    const mobileRowSelection = touchPage.getByRole('checkbox', { name: 'Select row' }).first()
    await mobileRowSelection.check()
    await expect(mobileRowSelection).toBeChecked()
    const mobileGeometry = await readShellGeometry(touchPage)
    expect(mobileGeometry.documentScrollWidth).toBeLessThanOrEqual(
      mobileGeometry.documentClientWidth,
    )
  }
  finally {
    await touchContext.close()
  }
})

test('applies light and dark themes at standard and compact density', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1280, height: 900 })
  await signInAsAdmin(page)
  await page.goto('/users')

  const themeSurfaces = new Map<ThemeMode, string>()
  for (const themeMode of ['light', 'dark'] as const) {
    for (const density of ['standard', 'compact'] as const) {
      await useThemeDensitySettings(page, { density, themeMode })
      const geometry = await readThemeDensityGeometry(page)
      const expectedControlHeight = density === 'compact' ? 32 : 36
      const expectedTableRowHeight = density === 'compact' ? 36 : 44
      const expectedTableRowVariable = density === 'compact' ? 34 : 40

      expect(geometry.searchControlHeight).toBe(expectedControlHeight)
      // AI modified: density sets the row floor; wrapped business text may grow beyond it.
      expect(geometry.tableRowHeight).toBeGreaterThan(expectedTableRowHeight)
      expect(geometry.tableHeadHeight).toBeGreaterThanOrEqual(expectedTableRowVariable)
      if (themeMode === 'dark')
        await expect(page.locator('html')).toHaveClass(/dark/)
      else await expect(page.locator('html')).not.toHaveClass(/dark/)

      const existingSurface = themeSurfaces.get(themeMode)
      if (existingSurface)
        expect(geometry.bodyBackgroundColor).toBe(existingSurface)
      else themeSurfaces.set(themeMode, geometry.bodyBackgroundColor)
    }
  }

  expect(themeSurfaces.get('light')).not.toBe(themeSurfaces.get('dark'))
})

test('honors normal and reduced motion for routes, sheets, and theme view transitions', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await page.addInitScript(() => {
    const storedAppearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    localStorage.setItem('locale', 'en-US')
    localStorage.setItem(
      'appearance',
      JSON.stringify({ ...storedAppearance, locale: 'en-US', themeMode: 'light' }),
    )

    const originalStartViewTransition = document.startViewTransition?.bind(document)
    if (!originalStartViewTransition)
      return
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: (updateCallback: () => Promise<void> | void) => {
        const invocationCount = Number(sessionStorage.getItem('view-transition-count') ?? '0')
        sessionStorage.setItem('view-transition-count', String(invocationCount + 1))
        return originalStartViewTransition(updateCallback)
      },
    })
  })

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Theme' })).toBeVisible()
  const supportsViewTransitions = await page.evaluate(
    () => typeof document.startViewTransition === 'function',
  )
  expect(supportsViewTransitions).toBe(true)

  const normalViewTransitionDuration = durationToMilliseconds(
    await page.evaluate(
      () =>
        getComputedStyle(document.documentElement, '::view-transition-new(root)').animationDuration,
    ),
  )
  expect(normalViewTransitionDuration).toBeGreaterThan(100)
  await page.getByRole('button', { name: 'Theme' }).click()
  await expect
    .poll(() => page.evaluate(() => Number(sessionStorage.getItem('view-transition-count') ?? '0')))
    .toBe(1)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedViewTransitionDuration = durationToMilliseconds(
    await page.evaluate(
      () =>
        getComputedStyle(document.documentElement, '::view-transition-new(root)').animationDuration,
    ),
  )
  expect(reducedViewTransitionDuration).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: 'Theme' }).click()
  await expect
    .poll(() => page.evaluate(() => Number(sessionStorage.getItem('view-transition-count') ?? '0')))
    .toBe(2)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 1280, height: 900 })
  await signInAsAdmin(page)

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion })
    await useShellSettings(page, {
      layout: 'sidebar',
      locale: 'en-US',
      sidebarDefault: 'expanded',
    })

    const targetPath = new URL(page.url()).pathname === '/dashboard' ? '/components' : '/dashboard'
    const routeDuration = await captureRouteTransitionDuration(page, targetPath)

    await page.getByRole('button', { name: 'Appearance' }).click()
    const sheetDuration = longestMotionDuration(await readSheetMotion(page))
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-slot="sheet-content"]:visible')).toHaveCount(0)

    if (reducedMotion === 'reduce') {
      expect(routeDuration).toBeLessThanOrEqual(1)
      expect(sheetDuration).toBeLessThanOrEqual(1)
    }
    else {
      expect(routeDuration).toBeGreaterThan(100)
      expect(sheetDuration).toBeGreaterThan(100)
    }
  }
})
