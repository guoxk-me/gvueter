import type { Page } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'

interface SignInCredentials {
  email: string
  password: string
}

async function signIn(page: Page, credentials: SignInCredentials) {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en-US')
    const appearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    localStorage.setItem('appearance', JSON.stringify({ ...appearance, locale: 'en-US' }))
  })
  await page.goto('/login')
  const captchaChallenge = page
    .locator('[aria-label]')
    .filter({ hasText: /\d+\s*\+\s*\d+\s*=\s*\?/ })
    .first()
  await expect(captchaChallenge).toBeVisible()
  const challengeText = await captchaChallenge.textContent()
  const operands = challengeText?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  // AI modified: browser tests solve the current MSW challenge instead of bypassing login validation.
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/dashboard')
}

async function signInAsAdmin(page: Page) {
  await signIn(page, { email: 'admin@example.com', password: 'admin123' })
}

test('completes the full SSO handoff and preserves the protected destination', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en-US')
    localStorage.setItem('appearance', JSON.stringify({ locale: 'en-US' }))
  })
  await page.goto('/users')
  await expect(page).toHaveURL(/\/login\?redirect=\/users/)

  await page.getByRole('button', { name: 'Continue with Mock Enterprise SSO' }).click()
  await expect(page).toHaveURL('/users')
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()

  const session = await page.evaluate(() => ({
    localToken: localStorage.getItem('auth_token'),
    provider: sessionStorage.getItem('auth_provider'),
    tenantId: sessionStorage.getItem('auth_tenant_id'),
    token: sessionStorage.getItem('auth_token'),
    url: window.location.href,
  }))
  expect(session.localToken).toBeNull()
  expect(session.provider).toBe('sso')
  expect(session.tenantId).toBe('tenant-demo')
  expect(session.token).toMatch(/^mock-session-/)
  expect(session.url).not.toContain('ticket')
})

test('restores an authenticated session after refreshing the dashboard', async ({ page }) => {
  await signInAsAdmin(page)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // AI modified: route assertions own readiness after the refreshed document commits.
  await page.reload({ waitUntil: 'commit' })

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('announces connectivity loss and recovery from the global network boundary', async ({
  page,
}) => {
  await signInAsAdmin(page)

  // AI modified: wait until the authenticated shell has mounted NetworkStatus before emitting events.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.context().setOffline(true)
  await expect(
    page.getByText('You are offline. Some actions will retry after the connection is restored.'),
  ).toBeVisible()

  await page.context().setOffline(false)
  await expect(page.getByText('Connection restored', { exact: true })).toBeVisible()
})

test('allows an administrator to load user management', async ({ page }) => {
  await signInAsAdmin(page)
  await page.getByRole('link', { name: 'User Management' }).click()

  await expect(page).toHaveURL('/users')
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New User' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search' }).fill('admin@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  // AI modified: verify the server-side search path instead of depending on default page ordering.
  await expect(page.getByRole('cell', { name: /admin@example\.com/ })).toBeVisible()
})

test('redacts sensitive user fields at the API boundary for a read-only editor', async ({
  page,
}) => {
  await signIn(page, { email: 'editor@example.com', password: 'editor123' })

  const userResponse = await page.evaluate(async () => {
    const accessToken = sessionStorage.getItem('auth_token')
    const response = await fetch('/api/users?pageSize=100', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return {
      body: (await response.json()) as {
        data: {
          items: Array<Record<string, unknown> & { email: string }>
        }
      },
      status: response.status,
    }
  })

  expect(userResponse.status).toBe(200)
  expect(userResponse.body.data.items.length).toBeGreaterThan(0)
  // AI modified: browser acceptance covers the API payload, not only masked table presentation.
  for (const user of userResponse.body.data.items) {
    expect(user.email).toContain('***')
    expect(user).not.toHaveProperty('avatar')
    expect(user).not.toHaveProperty('departmentId')
    expect(user).not.toHaveProperty('departmentPath')
  }
  expect(JSON.stringify(userResponse.body)).not.toContain('editor@example.com')
})

test('keeps user pagination UI, request parameters, rows, buttons, and URL synchronized', async ({
  page,
}) => {
  await signInAsAdmin(page)
  const requestSnapshots: Array<{ page: number; pageSize: number }> = []
  let latestUserRequest: URL | undefined
  page.on('request', (request) => {
    const requestUrl = new URL(request.url())
    if (request.method() !== 'GET' || requestUrl.pathname !== '/api/users') return

    latestUserRequest = requestUrl
    const pageNumber = Number(requestUrl.searchParams.get('page') ?? 1)
    const pageSize = Number(requestUrl.searchParams.get('pageSize') ?? 5)
    requestSnapshots.push({ page: pageNumber, pageSize })
  })

  await page.getByRole('link', { name: 'User Management' }).click()
  const visibleRows = page.locator('tbody tr[data-row-id]')
  const previousPage = page.getByRole('button', { name: 'Previous page' })
  const nextPage = page.getByRole('button', { name: 'Next page' })
  const pageSize = page.getByRole('combobox', { name: 'Rows per page' })

  // AI modified: the browser gate asserts one server request and its matching visible snapshot together.
  await expect.poll(() => requestSnapshots.at(-1)).toEqual({ page: 1, pageSize: 5 })
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await expect(visibleRows).toHaveCount(5)
  await expect(pageSize).toHaveText('5')
  await expect(previousPage).toBeDisabled()
  await expect(nextPage).toBeEnabled()

  const firstRowSelection = page.getByRole('checkbox', { name: 'Select row' }).first()
  await firstRowSelection.check()
  await expect(firstRowSelection).toBeChecked()
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(firstRowSelection).not.toBeChecked()

  await nextPage.click()
  await expect.poll(() => requestSnapshots.at(-1)).toEqual({ page: 2, pageSize: 5 })
  await expect(page).toHaveURL('/users?page=2')
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
  await expect(visibleRows).toHaveCount(3)
  await expect(previousPage).toBeEnabled()
  await expect(nextPage).toBeDisabled()

  await page.reload({ waitUntil: 'commit' })
  await expect.poll(() => requestSnapshots.at(-1)).toEqual({ page: 2, pageSize: 5 })
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
  await expect(visibleRows).toHaveCount(3)

  await page.goto('/dashboard')
  await expect(page).toHaveURL('/dashboard')
  await page.goBack()
  await expect(page).toHaveURL('/users?page=2')
  await expect(page.getByText('Page 2 of 2')).toBeVisible()
  await expect(visibleRows).toHaveCount(3)

  await pageSize.click()
  await page.getByRole('option', { name: '10', exact: true }).click()
  await expect.poll(() => requestSnapshots.at(-1)).toEqual({ page: 1, pageSize: 10 })
  await expect(page).toHaveURL('/users?pageSize=10')
  await expect(page.getByText('Page 1 of 1')).toBeVisible()
  await expect(visibleRows).toHaveCount(8)
  await expect(pageSize).toHaveText('10')
  await expect(previousPage).toBeDisabled()
  await expect(nextPage).toBeDisabled()

  await pageSize.click()
  await page.getByRole('option', { name: '5', exact: true }).click()
  await expect.poll(() => requestSnapshots.at(-1)).toEqual({ page: 1, pageSize: 5 })
  await expect(page).toHaveURL('/users')
  await expect(page.getByText('Page 1 of 2')).toBeVisible()
  await expect(visibleRows).toHaveCount(5)
  await expect(pageSize).toHaveText('5')

  // AI modified: the browser contract verifies sorting across the request, URL, and rendered rows.
  await page.getByRole('button', { name: 'Name', exact: true }).click()
  await expect
    .poll(() => ({
      page: latestUserRequest?.searchParams.get('page'),
      pageSize: latestUserRequest?.searchParams.get('pageSize'),
      sortField: latestUserRequest?.searchParams.get('sortField'),
      sortDirection: latestUserRequest?.searchParams.get('sortDirection'),
    }))
    .toEqual({ page: '1', pageSize: '5', sortField: 'name', sortDirection: 'asc' })
  await expect(page).toHaveURL('/users?sortBy=name&sortOrder=asc')
  await expect(visibleRows.first()).toContainText(
    'Alexandria Catherine Montgomery-Whittaker Global Operations Reviewer',
  )
})

test('loads and refreshes an allowlisted iframe with safe recovery actions', async ({ page }) => {
  await signInAsAdmin(page)
  await page.getByRole('button', { name: 'Resources' }).click()
  // AI modified: external menu targets retain the runtime allowlist's safe browsing attributes.
  const documentationLink = page.getByRole('link', { name: 'Documentation', exact: true })
  await expect(documentationLink).toHaveAttribute('href', '/embedded-help.html')
  await expect(documentationLink).toHaveAttribute('target', '_blank')
  await expect(documentationLink).toHaveAttribute('rel', 'noopener noreferrer')
  await page.getByRole('link', { name: 'Embedded Documentation' }).click()

  await expect(page).toHaveURL('/embedded-documentation')
  const embeddedRegion = page.getByRole('region', { name: 'Embedded Documentation' })
  const embeddedFrame = embeddedRegion.locator('iframe')
  await expect(embeddedFrame).toHaveAttribute('sandbox', 'allow-forms allow-popups allow-scripts')
  await expect(embeddedFrame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  await expect(embeddedRegion.getByText('Ready', { exact: true })).toBeVisible()
  // AI modified: Validate the configured runtime origin instead of coupling the test to a dev-server port.
  const applicationOrigin = new URL(page.url()).origin
  await expect(embeddedRegion).toContainText(applicationOrigin)

  const externalRecovery = embeddedRegion.getByRole('link', { name: 'Open in a new window' })
  await expect(externalRecovery).toHaveAttribute('href', '/embedded-help.html')
  await expect(externalRecovery).toHaveAttribute('target', '_blank')
  await expect(externalRecovery).toHaveAttribute('rel', 'noopener noreferrer')

  // AI modified: Refresh must remount the frame and still recover to its ready state.
  await embeddedRegion.getByRole('button', { name: 'Refresh embedded page' }).click()
  await expect(embeddedRegion.getByText('Ready', { exact: true })).toBeVisible()
})

test('allows an administrator to review the role permission matrix', async ({ page }) => {
  await signInAsAdmin(page)
  await page.getByRole('link', { name: 'Roles & Permissions' }).click()

  await expect(page).toHaveURL('/roles')
  await expect(page.getByRole('heading', { name: 'Roles & Permissions' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'View Dashboard' })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Save role policy' })).toBeDisabled()
})

test('allows an administrator to save an edited role policy', async ({ page }) => {
  await signInAsAdmin(page)
  await page.getByRole('link', { name: 'Roles & Permissions' }).click()
  await page.getByRole('button', { name: /Content Editor/ }).click()

  const viewSettings = page.getByRole('checkbox', { name: 'View Settings' })
  await expect(viewSettings).not.toBeChecked()
  await viewSettings.check()

  const savePolicy = page.getByRole('button', { name: 'Save role policy' })
  await expect(savePolicy).toBeEnabled()
  await savePolicy.click()

  await expect(page.getByText('Role policy saved')).toBeVisible()
  await expect(savePolicy).toBeDisabled()
})

test('imports a validated CSV user through the ProTable toolbar', async ({ page }) => {
  await signInAsAdmin(page)
  await page.getByRole('link', { name: 'User Management' }).click()
  await page.getByRole('button', { name: 'Import CSV' }).click()

  const importDialog = page.getByRole('dialog', { name: 'Import users' })
  await expect(importDialog).toBeVisible()
  const fileChooserPromise = page.waitForEvent('filechooser')
  await importDialog.getByRole('button', { name: /Choose an import file/ }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'users.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'name,email,role,status\nBrowser Import,browser.import@example.com,viewer,active',
    ),
  })
  await importDialog.getByRole('button', { name: 'Import users' }).click()

  await expect(page.getByText('Imported 1 users and skipped 0 rows')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search' }).fill('browser.import@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('cell', { name: /browser.import@example.com/ })).toBeVisible()
})

test('persists appearance settings and can restore defaults', async ({ page }) => {
  await signInAsAdmin(page)
  await page.getByRole('button', { name: 'Appearance' }).click()
  await expect(page.getByRole('dialog', { name: 'Appearance' })).toBeVisible()

  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Large', exact: true }).click()
  await page.getByRole('button', { name: /^Top Nav\b/ }).click()
  await page.reload({ waitUntil: 'commit' })

  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.locator('html')).toHaveAttribute('data-component-size', 'lg')
  await expect(page.locator('.admin-layout[data-layout="top"]')).toBeVisible()

  // AI modified: Firefox+MSW can defer lifecycle events after commit; the row assertion owns readiness.
  await page.goto('/users', { waitUntil: 'commit' })
  const firstUserRow = page.locator('tbody tr[data-row-id]').first()
  await expect(firstUserRow).toBeVisible()
  // AI modified: large density sets a 56px floor while wrapped user content may grow the row.
  await expect(firstUserRow).toHaveCSS('min-height', '56px')
  await expect
    .poll(() => firstUserRow.evaluate((row) => row.getBoundingClientRect().height))
    .toBeGreaterThan(56)

  await page.getByRole('button', { name: 'Appearance' }).click()
  await page.getByRole('button', { name: 'Reset to Default' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-component-size', 'default')
  await expect(page.locator('.admin-layout[data-layout="sidebar"]')).toBeVisible()
})

test('redirects an expired or invalid backend session to login', async ({ page }) => {
  await signInAsAdmin(page)
  await page.evaluate(() => sessionStorage.setItem('auth_token', 'invalid-token'))

  await page.reload({ waitUntil: 'commit' })

  // AI modified: the browser verifies the protected API 401 path, not only the route guard UX.
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('switches every supported layout contract from the persisted settings panel', async ({
  page,
}) => {
  await signInAsAdmin(page)
  await page.getByRole('button', { name: 'Appearance' }).click()

  const layouts = [
    { name: /^Sidebar Classic left sidebar navigation$/, id: 'sidebar' },
    { name: /^Top Nav Horizontal top navigation bar$/, id: 'top' },
    {
      name: /^Dual Sidebar \/ Split Sidebar Split primary and secondary navigation across two sidebars$/,
      id: 'mixed',
    },
    {
      name: /^Sidebar Hybrid · Header First Primary sidebar with the page header above secondary navigation\.$/,
      id: 'sidebar-hybrid-header-first',
    },
    {
      name: /^Header Hybrid · Sidebar First Primary header with the sidebar leading the content region\.$/,
      id: 'header-hybrid-sidebar-first',
    },
    {
      name: /^Header Hybrid · Header First Two-level header navigation above a focused content canvas\.$/,
      id: 'header-hybrid-header-first',
    },
  ] as const

  for (const layout of layouts) {
    await page.getByRole('button', { name: layout.name }).click()
    await expect(page.locator(`.admin-layout[data-layout="${layout.id}"]`)).toBeVisible()
  }
})

test('keeps the mobile dashboard, navigation, and settings free of horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAsAdmin(page)

  const widths = await page.evaluate(() => {
    const main = document.querySelector('main')
    return {
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      mainClientWidth: main?.clientWidth ?? 0,
      mainScrollWidth: main?.scrollWidth ?? 0,
    }
  })
  expect(widths.documentScrollWidth).toBe(widths.documentClientWidth)
  expect(widths.mainScrollWidth).toBe(widths.mainClientWidth)

  await page.getByRole('button', { name: 'Navigation' }).click()
  await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Appearance' }).click()
  await expect(page.getByRole('dialog', { name: 'Appearance' })).toBeVisible()
})

test('renders a themed QR code and exports an actual image crop', async ({ page }) => {
  await signInAsAdmin(page)
  // AI modified: legacy business demos remain interactive inside the focused patterns route.
  await page.goto('/components/patterns')
  await page.getByRole('tab', { name: 'Business Components' }).click()

  const qrCode = page.locator('canvas[aria-label="Generated QR code"]')
  await expect(qrCode).toBeVisible()
  await expect
    .poll(() => qrCode.evaluate((canvas) => (canvas as HTMLCanvasElement).width))
    .toBe(192)

  await page.getByRole('button', { name: 'Crop image' }).click()
  await expect(page.getByAltText('Cropped image result')).toBeVisible()
  await expect(page.locator('[role="alert"]')).toHaveCount(0)
})
