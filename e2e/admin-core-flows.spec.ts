import type { Locator, Page } from '@playwright/test'
import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'

interface AccountCredentials {
  email: string
  password: string
}

interface UserDraft {
  email: string
  name: string
}

const administratorCredentials: AccountCredentials = {
  email: 'admin@example.com',
  password: 'admin123',
}

async function signIn(page: Page, credentials: AccountCredentials): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'en-US')
    const appearance = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    localStorage.setItem('appearance', JSON.stringify({ ...appearance, locale: 'en-US' }))
  })
  // AI modified: the captcha assertion owns app readiness after the document commits.
  await page.goto('/login', { waitUntil: 'commit' })
  await completeLoginForm(page, credentials)
}

async function completeLoginForm(page: Page, credentials: AccountCredentials): Promise<void> {
  const captchaChallenge = page
    .locator('[aria-label]')
    .filter({ hasText: /\d+\s*\+\s*\d+\s*=\s*\?/ })
    .first()
  await expect(captchaChallenge).toBeVisible()
  const operands = (await captchaChallenge.textContent())?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)
  // AI modified: E2E login follows the protected MSW challenge instead of injecting a session.
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('.admin-layout')).toBeVisible()
}

async function searchUsers(page: Page, keyword: string): Promise<void> {
  const searchRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'GET'
      && requestUrl.pathname === '/api/users'
      && requestUrl.searchParams.get('keyword') === keyword
    )
  })
  await page.getByRole('searchbox', { name: 'Search' }).fill(keyword)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await searchRequest
}

// AI modified: workbench shadcn Selects are exercised through their public combobox semantics.
async function selectWorkbenchOption(
  page: Page,
  fieldLabel: string,
  optionLabel: string,
): Promise<void> {
  const trigger = page.getByRole('combobox', { name: fieldLabel, exact: true })
  await trigger.click()
  await page.getByRole('option', { name: optionLabel, exact: true }).click()
  await expect(trigger).toHaveText(optionLabel)
}

async function showCalendarMonth(
  calendar: Locator,
  heading: Locator,
  targetMonth: Date,
  targetHeading: string,
): Promise<void> {
  const displayedMonthLabel = (await heading.textContent())?.trim()
  if (!displayedMonthLabel)
    throw new Error('The calendar did not expose its visible month')
  const displayedMonth = new Date(`${displayedMonthLabel} 1`)
  if (Number.isNaN(displayedMonth.getTime()))
    throw new Error(`The calendar exposed an invalid month: ${displayedMonthLabel}`)

  const monthOffset
    = (targetMonth.getFullYear() - displayedMonth.getFullYear()) * 12
      + targetMonth.getMonth()
      - displayedMonth.getMonth()
  const navigationName = monthOffset > 0 ? 'Next page' : 'Previous page'
  for (let pageOffset = 0; pageOffset < Math.abs(monthOffset); pageOffset += 1) {
    await calendar.getByRole('button', { name: navigationName, exact: true }).click()
  }
  await expect(heading).toHaveText(targetHeading)
}

async function createUser(page: Page, userDraft: UserDraft): Promise<void> {
  await page.getByRole('button', { name: 'New User' }).click()
  const userDialog = page.getByRole('dialog', { name: 'New User' })
  await expect(userDialog).toBeVisible()
  await userDialog.getByLabel('Name').fill(userDraft.name)
  await userDialog.getByLabel('Email').fill(userDraft.email)
  await userDialog.getByLabel('Temporary Password').fill('BrowserPass1')

  const createRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'POST' && requestUrl.pathname === '/api/users'
  })
  await userDialog.getByRole('button', { name: 'Save', exact: true }).click()
  const createResponse = await createRequest
  expect(createResponse.status()).toBe(200)
  await expect(userDialog).toBeHidden()
  await expect(page.getByText('User saved', { exact: true }).last()).toBeVisible()
}

test('switches locale immediately and clears the authenticated session on logout', async ({
  page,
}) => {
  await signIn(page, administratorCredentials)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.getByRole('heading', { name: '仪表盘', level: 1 })).toBeVisible()
  await expect(page).toHaveTitle(/仪表盘 - 管理后台/)

  await page.getByRole('button', { name: /超级管理员/ }).click()
  const logoutRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'POST' && requestUrl.pathname === '/api/auth/logout'
  })
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  expect((await logoutRequest).status()).toBe(200)

  await expect(page).toHaveURL('/login')
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('auth_token'))).toBeNull()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull()
})

test('creates, edits, deletes, and bulk deletes users through protected APIs', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  await signIn(page, administratorCredentials)
  await page.getByRole('link', { name: 'User Management' }).click()
  await expect(page).toHaveURL('/users')

  const retrySuffix = `r${testInfo.retry}`
  const editedUser: UserDraft = {
    email: `browser.core.edit.${retrySuffix}@example.com`,
    name: `Browser Core Edit ${retrySuffix}`,
  }
  const individuallyDeletedUser: UserDraft = {
    email: `browser.core.delete.${retrySuffix}@example.com`,
    name: `Browser Core Delete ${retrySuffix}`,
  }
  const bulkUsers: readonly UserDraft[] = [
    {
      email: `browser.core.bulk.${retrySuffix}.a@example.com`,
      name: `Browser Core Bulk ${retrySuffix} A`,
    },
    {
      email: `browser.core.bulk.${retrySuffix}.b@example.com`,
      name: `Browser Core Bulk ${retrySuffix} B`,
    },
  ]

  await createUser(page, editedUser)
  await searchUsers(page, editedUser.email)
  const editableRow = page.locator('tbody tr[data-row-id]').filter({ hasText: editedUser.email })
  await expect(editableRow).toHaveCount(1)
  await editableRow.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()

  const editDialog = page.getByRole('dialog', { name: 'Edit User' })
  await editDialog.getByLabel('Name').fill('Browser Core Edited')
  const updateRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'PUT' && /^\/api\/users\/\d+$/.test(requestUrl.pathname)
  })
  await editDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await updateRequest).status()).toBe(200)
  await expect(editDialog).toBeHidden()
  await expect(editableRow).toContainText('Browser Core Edited')

  await createUser(page, individuallyDeletedUser)
  await searchUsers(page, individuallyDeletedUser.email)
  const deletableRow = page
    .locator('tbody tr[data-row-id]')
    .filter({ hasText: individuallyDeletedUser.email })
  await deletableRow.getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  const deleteDialog = page.getByRole('dialog', { name: 'Delete' })
  await expect(deleteDialog).toContainText(individuallyDeletedUser.name)
  const deleteRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'DELETE' && /^\/api\/users\/\d+$/.test(requestUrl.pathname)
    )
  })
  await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await deleteRequest).status()).toBe(200)
  await expect(page.getByText('User deleted', { exact: true })).toBeVisible()
  await expect(deletableRow).toHaveCount(0)

  for (const bulkUser of bulkUsers) await createUser(page, bulkUser)

  // AI modified: retry-specific fixtures isolate partial writes from a previous browser attempt.
  await searchUsers(page, `browser.core.bulk.${retrySuffix}`)
  const bulkRows = page.locator('tbody tr[data-row-id]')
  await expect(bulkRows).toHaveCount(2)
  for (const bulkUser of bulkUsers) {
    await bulkRows
      .filter({ hasText: bulkUser.email })
      .getByRole('checkbox', { name: 'Select row' })
      .check()
  }
  await expect(page.getByText('2 selected', { exact: true })).toBeVisible()

  const deletedUserPaths: string[] = []
  page.on('request', (request) => {
    const requestUrl = new URL(request.url())
    if (request.method() === 'DELETE' && /^\/api\/users\/\d+$/.test(requestUrl.pathname))
      deletedUserPaths.push(requestUrl.pathname)
  })
  await page.getByRole('button', { name: 'Delete selected' }).click()
  const bulkDeleteDialog = page.getByRole('dialog', { name: 'Delete selected' })
  await expect(bulkDeleteDialog).toContainText('Delete 2 selected users')
  await bulkDeleteDialog.getByRole('button', { name: 'Delete', exact: true }).click()

  await expect.poll(() => deletedUserPaths.length).toBe(2)
  await expect(new Set(deletedUserPaths).size).toBe(2)
  // AI modified: the success contract reports the exact number of deleted users.
  await expect(
    page.getByText(`Deleted ${bulkUsers.length} selected users`, { exact: true }),
  ).toBeVisible()
  await expect(bulkRows).toHaveCount(0)
})

test('revoking a non-recovery grant refreshes routes and navigation without self-locking', async ({
  page,
}) => {
  await signIn(page, administratorCredentials)
  await page.getByRole('button', { name: 'Administration', exact: true }).click()
  await page.getByRole('link', { name: 'User Management', exact: true }).click()
  await expect(page).toHaveURL('/users')
  await page.getByRole('link', { name: 'Roles & Permissions', exact: true }).click()
  await expect(page).toHaveURL('/roles')

  // AI modified: recovery grants stay locked while an ordinary route grant still exercises hot refresh.
  await expect(page.getByRole('checkbox', { name: 'View Role policy' })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: 'Edit Role policy' })).toBeDisabled()
  const viewUsers = page.getByRole('checkbox', { name: 'View Users' })
  await expect(viewUsers).toBeChecked()
  await viewUsers.uncheck()
  const policyUpdate = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'PUT' && requestUrl.pathname === '/api/roles/admin'
  })
  await page.getByRole('button', { name: 'Save role policy' }).click()
  expect((await policyUpdate).status()).toBe(200)

  await expect(page).toHaveURL('/roles')
  await expect(page.getByRole('link', { name: 'User Management', exact: true })).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL('/forbidden')
  await expect(page.getByRole('heading', { name: 'Access forbidden' })).toBeVisible()
})

test('validates, restores, submits, and recovers the dynamic stepped form', async ({ page }) => {
  test.setTimeout(90_000)
  await signIn(page, administratorCredentials)
  await page.goto('/form-workbench')
  await expect(page.getByRole('heading', { name: 'Form Workbench' })).toBeVisible()

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  const titleField = page.getByLabel('Request title')
  await expect(titleField).toHaveAttribute('aria-invalid', 'true')
  await expect(titleField).toBeFocused()

  await titleField.fill('Browser verified customer rollout')
  await selectWorkbenchOption(page, 'Category', 'Customer delivery')
  await page.getByLabel('Budget').fill('1250')
  await page.getByRole('checkbox', { name: 'Operations' }).check()
  await selectWorkbenchOption(page, 'Province / municipality', 'Zhejiang')
  await expect(page.getByRole('combobox', { name: 'City', exact: true })).toBeEnabled()
  await selectWorkbenchOption(page, 'City', 'Hangzhou')

  // AI modified: DateTimePicker is exercised through its calendar/time draft before confirmation.
  const publishAtTrigger = page.getByRole('button', {
    name: 'Publish date and time',
    exact: true,
  })
  await publishAtTrigger.click()
  const publishAtPopover = page.getByRole('dialog').filter({
    has: page.getByRole('textbox', { name: 'Publish date and time', exact: true }),
  })
  const publishAtCalendar = publishAtPopover.locator('[data-slot="calendar"]')
  const calendarHeading = publishAtCalendar.locator('[data-slot="calendar-heading"]')
  await expect(publishAtPopover).toBeVisible()
  await showCalendarMonth(publishAtCalendar, calendarHeading, new Date(2026, 7, 1), 'August 2026')
  await publishAtCalendar
    .getByRole('button', { name: 'Saturday, August 1, 2026', exact: true })
    .click()
  await publishAtPopover
    .getByRole('textbox', { name: 'Publish date and time', exact: true })
    .fill('10:30')
  await publishAtPopover.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(publishAtTrigger).toContainText(/Aug 1, 2026.*10:30 AM/)
  await expect(page.locator('input[type="hidden"][name="publishAt"]')).toHaveValue(
    '2026-08-01T10:30',
  )
  await page.getByLabel('Delivery address').fill('88 Browser Verification Road, Hangzhou')

  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText('Draft saved locally', { exact: true })).toBeVisible()
  // AI modified: persisted-content assertions own readiness after the refreshed document commits.
  await page.reload({ waitUntil: 'commit' })
  // AI modified: browser evidence covers persisted recovery, not only the draft serializer unit test.
  await expect(page.getByText('Local draft restored', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Request title')).toHaveValue('Browser verified customer rollout')

  const titleAvailabilityRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      requestUrl.pathname === '/api/form-workbench/title-availability'
      && requestUrl.searchParams.get('title') === 'Browser verified customer rollout'
    )
  })
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  expect((await titleAvailabilityRequest).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Content and files' })).toBeVisible()

  // AI modified: DateRangePicker now follows the visible range-calendar selection contract.
  const activeRangeTrigger = page.getByRole('button', { name: 'Active date range', exact: true })
  await activeRangeTrigger.click()
  const activeRangePopover = page.getByRole('dialog').filter({
    has: page.locator('[data-slot="range-calendar"]'),
  })
  const activeRangeCalendar = activeRangePopover.locator('[data-slot="range-calendar"]')
  const activeRangeHeading = activeRangeCalendar.locator('[data-slot="range-calendar-heading"]')
  await expect(activeRangePopover).toBeVisible()
  await showCalendarMonth(
    activeRangeCalendar,
    activeRangeHeading,
    new Date(2026, 7, 1),
    'August 2026',
  )
  await activeRangeCalendar
    .getByRole('button', { name: 'Saturday, August 1, 2026', exact: true })
    .click()
  await activeRangeCalendar
    .getByRole('button', { name: 'Saturday, August 15, 2026', exact: true })
    .click()
  await activeRangePopover.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(activeRangeTrigger).toContainText('Aug 1, 2026 – Aug 15, 2026')

  const supportingFileChooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: /Add supporting documents/ }).click()
  await (
    await supportingFileChooser
  ).setFiles({
    name: 'browser-verification.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Verified supporting context.'),
  })
  await expect(page.getByText('browser-verification.txt', { exact: true })).toBeVisible()

  await page
    .locator('.ql-editor[contenteditable="true"]')
    .fill('Customer rollout context and acceptance criteria.')
  await page
    .getByLabel('Markdown notes')
    .fill('## Browser verification\n\nShip the validated customer rollout.')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible()
  await expect(page.locator('main')).toContainText('Browser verified customer rollout')
  await expect(page.locator('main')).toContainText('Customer delivery')
  await expect(page.locator('main')).toContainText('Zhejiang / Hangzhou')
  await expect(page.locator('main')).toContainText('browser-verification.txt')

  const conflictingSubmissionStatus = await page.evaluate(async () => {
    const authToken = sessionStorage.getItem('auth_token')
    const response = await fetch('/api/form-workbench/submissions', {
      method: 'POST',
      headers: [
        ['Authorization', `Bearer ${authToken ?? ''}`],
        ['Content-Type', 'application/json'],
      ],
      body: JSON.stringify({
        activeRange: { end: '2026-08-15', start: '2026-08-01' },
        address: '88 Browser Verification Road, Hangzhou',
        attachmentNames: ['browser-verification.txt'],
        budget: 1250,
        category: 'customer',
        city: 'hangzhou',
        imageNames: [],
        markdown: '## Browser verification\n\nShip the validated customer rollout.',
        province: 'zhejiang',
        publishAt: '2026-08-01T10:30',
        reviewers: ['operations'],
        richContent: '<p>Customer rollout context and acceptance criteria.</p>',
        title: 'Browser verified customer rollout',
      }),
    })
    return response.status
  })
  expect(conflictingSubmissionStatus).toBe(201)

  const conflictResponse = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'POST'
      && requestUrl.pathname === '/api/form-workbench/submissions'
    )
  })
  await page.getByRole('button', { name: 'Submit request' }).click()
  expect((await conflictResponse).status()).toBe(409)
  await expect(page.getByRole('heading', { name: 'Request details' })).toBeVisible()
  await expect(page.getByLabel('Request title')).toBeFocused()
  await expect(page.getByText('This title is already in use', { exact: true })).toBeVisible()

  await page.getByLabel('Request title').fill('Browser verified customer rollout recovered')
  const recoveredTitleAvailability = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      requestUrl.pathname === '/api/form-workbench/title-availability'
      && requestUrl.searchParams.get('title') === 'Browser verified customer rollout recovered'
    )
  })
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  expect((await recoveredTitleAvailability).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Content and files' })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review and submit' })).toBeVisible()

  const submissionRequest = page.waitForRequest((request) => {
    const requestUrl = new URL(request.url())
    return request.method() === 'POST' && requestUrl.pathname === '/api/form-workbench/submissions'
  })
  const submissionResponse = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'POST'
      && requestUrl.pathname === '/api/form-workbench/submissions'
    )
  })
  await page.getByRole('button', { name: 'Submit request' }).click()
  const submittedPayload: unknown = (await submissionRequest).postDataJSON()
  expect(submittedPayload).toMatchObject({
    activeRange: { end: '2026-08-15', start: '2026-08-01' },
    address: '88 Browser Verification Road, Hangzhou',
    attachmentNames: ['browser-verification.txt'],
    budget: 1250,
    category: 'customer',
    city: 'hangzhou',
    province: 'zhejiang',
    reviewers: ['operations'],
    title: 'Browser verified customer rollout recovered',
  })
  expect((await submissionResponse).status()).toBe(201)
  await expect(page.getByText('Form submitted', { exact: true })).toBeVisible()
  await expect(page.getByText(/^form-submission-\d+$/)).toBeVisible()
})

test('redirects a low-permission account that opens a restricted route directly', async ({
  page,
}) => {
  await signIn(page, {
    email: 'viewer@example.com',
    password: 'viewer123',
  })

  await page.goto('/roles')

  await expect(page).toHaveURL('/forbidden')
  await expect(page.getByRole('heading', { name: 'Access forbidden' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Roles & Permissions' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Roles & Permissions' })).toHaveCount(0)
})
