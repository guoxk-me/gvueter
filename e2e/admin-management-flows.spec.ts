import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from '@playwright/test'

interface AccountCredentials {
  email: string
  password: string
}

interface NamedListEnvelope {
  data: {
    items: Array<{ name: string }>
  }
}

const administratorCredentials: AccountCredentials = {
  email: 'admin@example.com',
  password: 'admin123',
}

function getRunSuffix(testInfo: TestInfo): string {
  return `${testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${testInfo.retry}`
}

async function signIn(page: Page): Promise<void> {
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
  const operands = (await captchaChallenge.textContent())?.match(/(\d+)\s*\+\s*(\d+)/)
  if (!operands?.[1] || !operands[2])
    throw new Error('The login captcha did not expose an arithmetic challenge')

  await page.getByRole('textbox', { name: 'Email' }).fill(administratorCredentials.email)
  await page.locator('input[type="password"]').fill(administratorCredentials.password)
  // AI modified: management E2E enters through the same protected login boundary as production UI.
  await page
    .locator('input[inputmode="numeric"]')
    .fill(String(Number(operands[1]) + Number(operands[2])))
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('.admin-layout')).toBeVisible()
}

test('completes department and position CRUD through their management workspaces', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const runSuffix = getRunSuffix(testInfo)
  const departmentName = `Browser Operations ${runSuffix}`
  const updatedDepartmentName = `Browser Service Operations ${runSuffix}`
  const positionCode = `browser-operator-${runSuffix}`
  const positionName = `Browser Operator ${runSuffix}`
  const updatedPositionName = `Browser Operations Lead ${runSuffix}`

  await signIn(page)
  await page.goto('/departments')
  await expect(page.getByRole('heading', { name: 'Department Management', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'New department' }).click()
  const departmentDialog = page.getByRole('dialog', { name: 'New department' })
  await departmentDialog
    .getByRole('textbox', { name: 'Department', exact: true })
    .fill(departmentName)
  await departmentDialog.getByLabel('Order', { exact: true }).fill('880')
  const createDepartmentRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'POST' && requestUrl.pathname === '/api/departments'
  })
  const refreshDepartmentsRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'GET' && requestUrl.pathname === '/api/departments'
  })
  await departmentDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await createDepartmentRequest).status()).toBe(200)
  const refreshedDepartmentsResponse = await refreshDepartmentsRequest
  expect(refreshedDepartmentsResponse.status()).toBe(200)
  const refreshedDepartments = (await refreshedDepartmentsResponse.json()) as NamedListEnvelope
  expect(refreshedDepartments.data.items.map(department => department.name)).toContain(
    departmentName,
  )
  await expect(departmentDialog).toBeHidden()

  const createdDepartmentRow = page.locator('tbody tr').filter({ hasText: departmentName })
  await expect(createdDepartmentRow).toHaveCount(1)
  await createdDepartmentRow.getByRole('button', { name: 'Edit department' }).click()
  const editDepartmentDialog = page.getByRole('dialog', { name: 'Edit department' })
  await editDepartmentDialog
    .getByRole('textbox', { name: 'Department', exact: true })
    .fill(updatedDepartmentName)
  const updateDepartmentRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'PUT'
      && /^\/api\/departments\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  const refreshUpdatedDepartmentsRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'GET' && requestUrl.pathname === '/api/departments'
  })
  await editDepartmentDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await updateDepartmentRequest).status()).toBe(200)
  expect((await refreshUpdatedDepartmentsRequest).status()).toBe(200)
  await expect(editDepartmentDialog).toBeHidden()

  const persistedDepartmentRow = page.locator('tbody tr').filter({ hasText: updatedDepartmentName })
  await expect(persistedDepartmentRow).toHaveCount(1)
  await persistedDepartmentRow.getByRole('button', { name: 'Delete' }).click()
  const deleteDepartmentDialog = page.getByRole('dialog', { name: 'Delete department' })
  await expect(deleteDepartmentDialog).toContainText(updatedDepartmentName)
  const deleteDepartmentRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'DELETE'
      && /^\/api\/departments\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await deleteDepartmentDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await deleteDepartmentRequest).status()).toBe(200)
  await expect(persistedDepartmentRow).toHaveCount(0)

  await page.goto('/positions')
  await expect(page.getByRole('heading', { name: 'Position Management', level: 1 })).toBeVisible()
  await page.getByRole('button', { name: 'New position' }).click()
  const positionDialog = page.getByRole('dialog', { name: 'New position' })
  await positionDialog.getByLabel('Code', { exact: true }).fill(positionCode)
  await positionDialog.getByLabel('Position', { exact: true }).fill(positionName)
  await positionDialog
    .getByLabel('Description', { exact: true })
    .fill('Created by the browser management flow.')
  await positionDialog.getByLabel('Order', { exact: true }).fill('880')
  const createPositionRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'POST' && requestUrl.pathname === '/api/positions'
  })
  const refreshPositionsRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'GET' && requestUrl.pathname === '/api/positions'
  })
  await positionDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await createPositionRequest).status()).toBe(200)
  expect((await refreshPositionsRequest).status()).toBe(200)
  await expect(positionDialog).toBeHidden()

  const createdPositionRow = page.locator('tbody tr').filter({ hasText: positionCode })
  await expect(createdPositionRow).toHaveCount(1)
  await createdPositionRow.getByRole('button', { name: 'Edit position' }).click()
  const editPositionDialog = page.getByRole('dialog', { name: 'Edit position' })
  await editPositionDialog.getByLabel('Position', { exact: true }).fill(updatedPositionName)
  const updatePositionRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'PUT' && /^\/api\/positions\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await editPositionDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await updatePositionRequest).status()).toBe(200)
  await expect(editPositionDialog).toBeHidden()

  const filteredPositionRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'GET'
      && requestUrl.pathname === '/api/positions'
      && requestUrl.searchParams.get('keyword') === positionCode
    )
  })
  await page.getByRole('searchbox', { name: 'Search position name or code' }).fill(positionCode)
  // AI modified: management filters apply as an explicit snapshot instead of issuing one request per keystroke.
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  expect((await filteredPositionRequest).status()).toBe(200)
  const filteredPositionRow = page.locator('tbody tr').filter({ hasText: updatedPositionName })
  await expect(filteredPositionRow).toHaveCount(1)
  await filteredPositionRow.getByRole('button', { name: 'Delete' }).click()
  const deletePositionDialog = page.getByRole('dialog', { name: 'Delete position' })
  await expect(deletePositionDialog).toContainText(updatedPositionName)
  const deletePositionRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'DELETE'
      && /^\/api\/positions\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await deletePositionDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await deletePositionRequest).status()).toBe(200)
  await expect(filteredPositionRow).toHaveCount(0)
})

test('completes dictionary type and entry lifecycle through the master-detail UI', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const runSuffix = getRunSuffix(testInfo).replaceAll('-', '_')
  const dictionaryCode = `browser_priority_${runSuffix}`
  const dictionaryName = `Browser priority ${runSuffix}`
  const entryLabel = `Escalated ${runSuffix}`
  const updatedEntryLabel = `Critical ${runSuffix}`
  const entryValue = `critical_${runSuffix}`

  await signIn(page)
  await page.goto('/dictionaries')
  await expect(page.getByRole('heading', { name: 'Dictionary Management', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: 'New dictionary type' }).click()
  const typeDialog = page.getByRole('dialog', { name: 'New dictionary type' })
  await typeDialog.getByLabel('Type code', { exact: true }).fill(dictionaryCode)
  await typeDialog.getByLabel('Type name', { exact: true }).fill(dictionaryName)
  await typeDialog
    .getByLabel('Description', { exact: true })
    .fill('Browser-verified priority values.')
  const createTypeRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'POST' && requestUrl.pathname === '/api/dictionaries/types'
    )
  })
  const refreshTypesRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'GET' && requestUrl.pathname === '/api/dictionaries/types'
    )
  })
  await typeDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await createTypeRequest).status()).toBe(201)
  expect((await refreshTypesRequest).status()).toBe(200)
  await expect(typeDialog).toBeHidden()

  const dictionaryTypeItem = page
    .getByRole('list', { name: 'Dictionary types' })
    .getByRole('listitem')
    .filter({ hasText: dictionaryCode })
  await expect(dictionaryTypeItem).toHaveCount(1)
  const dictionaryTypeSelector = dictionaryTypeItem.getByRole('button').first()
  // AI modified: select the newly persisted master explicitly before exercising its detail lifecycle.
  await dictionaryTypeSelector.click()
  await expect(dictionaryTypeSelector).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'New dictionary entry' }).click()
  const entryDialog = page.getByRole('dialog', { name: 'New dictionary entry' })
  await entryDialog.getByLabel('Label', { exact: true }).fill(entryLabel)
  await entryDialog.getByLabel('Value', { exact: true }).fill(entryValue)
  await entryDialog.getByLabel('Order', { exact: true }).fill('5')
  const createEntryRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'POST'
      && /^\/api\/dictionaries\/types\/[^/]+\/entries$/.test(requestUrl.pathname)
    )
  })
  const refreshEntriesRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'GET'
      && /^\/api\/dictionaries\/types\/[^/]+\/entries$/.test(requestUrl.pathname)
    )
  })
  await entryDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await createEntryRequest).status()).toBe(201)
  expect((await refreshEntriesRequest).status()).toBe(200)
  await expect(entryDialog).toBeHidden()

  const createdEntryRow = page.locator('tbody tr').filter({ hasText: entryValue })
  await expect(createdEntryRow).toHaveCount(1)
  await createdEntryRow.getByRole('button', { name: 'Edit dictionary entry' }).click()
  const editEntryDialog = page.getByRole('dialog', { name: 'Edit dictionary entry' })
  await editEntryDialog.getByLabel('Label', { exact: true }).fill(updatedEntryLabel)
  const updateEntryRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'PUT'
      && /^\/api\/dictionaries\/entries\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await editEntryDialog.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await updateEntryRequest).status()).toBe(200)
  await expect(editEntryDialog).toBeHidden()

  const updatedEntryRow = page.locator('tbody tr').filter({ hasText: updatedEntryLabel })
  await expect(updatedEntryRow).toHaveCount(1)
  await updatedEntryRow.getByRole('button', { name: 'Delete' }).click()
  const deleteEntryDialog = page.getByRole('dialog', { name: 'Delete dictionary entry' })
  const deleteEntryRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'DELETE'
      && /^\/api\/dictionaries\/entries\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await deleteEntryDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await deleteEntryRequest).status()).toBe(200)
  await expect(updatedEntryRow).toHaveCount(0)

  await dictionaryTypeItem.getByRole('button', { name: 'Delete' }).click()
  const deleteTypeDialog = page.getByRole('dialog', { name: 'Delete dictionary type' })
  await expect(deleteTypeDialog).toContainText(dictionaryName)
  const deleteTypeRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'DELETE'
      && /^\/api\/dictionaries\/types\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await deleteTypeDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await deleteTypeRequest).status()).toBe(200)
  await expect(dictionaryTypeItem).toHaveCount(0)
})

test('creates and removes a hidden menu-group contract with live navigation refresh', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const runSuffix = getRunSuffix(testInfo)
  const permissionIdentifier = `browser:e2e:resource-${runSuffix}`

  await signIn(page)
  await page.goto('/menus')
  await expect(
    page.getByRole('heading', { name: 'Menus & Permission Identifiers', level: 1 }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'New menu' }).click()
  const menuDialog = page.getByRole('dialog', { name: 'New menu' })

  await menuDialog.locator('input[name="titleKey"]').fill('nav.resources')
  await menuDialog.getByLabel('Permission identifier', { exact: true }).fill(permissionIdentifier)
  await menuDialog.getByLabel('Order', { exact: true }).fill('987')
  await menuDialog.getByRole('switch', { name: 'Hidden' }).click()

  const createMenuRequest = page.waitForResponse(
    (response) => {
      const requestUrl = new URL(response.url())
      return (
        response.request().method() === 'POST'
        && /\/api\/system-menus\/?$/.test(requestUrl.pathname)
      )
    },
    { timeout: 10_000 },
  )
  await menuDialog.getByRole('button', { name: 'Save', exact: true }).click()
  const menuValidationMessages = await menuDialog
    .locator('[data-slot="form-message"]')
    .allTextContents()
  expect(menuValidationMessages).toEqual([])
  await expect(menuDialog).toBeHidden()
  expect((await createMenuRequest).status()).toBe(200)

  // AI modified: the managed table proves the backend mutation refreshed the live navigation query.
  const menuRow = page.locator('tbody tr').filter({ hasText: permissionIdentifier })
  await expect(menuRow).toHaveCount(1)
  await expect(menuRow).toContainText('Internal route')
  await expect(menuRow).toContainText('Yes')
  await menuRow.getByRole('button', { name: 'Delete' }).click()
  const deleteMenuDialog = page.getByRole('dialog', { name: 'Delete menu' })
  const deleteMenuRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return (
      response.request().method() === 'DELETE'
      && /^\/api\/system-menus\/[^/]+$/.test(requestUrl.pathname)
    )
  })
  await deleteMenuDialog.getByRole('button', { name: 'Delete', exact: true }).click()
  expect((await deleteMenuRequest).status()).toBe(200)
  await expect(menuRow).toHaveCount(0)
})

test('confirms and persists a system-wide configuration change across an API refresh', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const siteName = `Browser Admin Console ${getRunSuffix(testInfo)}`

  await signIn(page)
  await page.goto('/system-config')
  await expect(page.getByRole('heading', { name: 'System Configuration', level: 1 })).toBeVisible()
  await page.getByLabel('Site name', { exact: true }).fill(siteName)

  await page.getByRole('button', { name: 'Save configuration' }).click()
  const confirmationDialog = page.getByRole('dialog', {
    name: 'Apply system-wide configuration?',
  })
  await expect(confirmationDialog).toBeVisible()
  const saveConfigRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'PUT' && requestUrl.pathname === '/api/system-config'
  })
  await confirmationDialog.getByRole('button', { name: 'Apply configuration' }).click()
  expect((await saveConfigRequest).status()).toBe(200)
  await expect(page.getByText('System configuration saved', { exact: true })).toBeVisible()

  const refreshConfigRequest = page.waitForResponse((response) => {
    const requestUrl = new URL(response.url())
    return response.request().method() === 'GET' && requestUrl.pathname === '/api/system-config'
  })
  // AI modified: explicit API refresh verifies persistence without resetting in-memory Mock handlers.
  await page.getByRole('button', { name: 'Refresh', exact: true }).click()
  expect((await refreshConfigRequest).status()).toBe(200)
  await expect(page.getByLabel('Site name', { exact: true })).toHaveValue(siteName)
})
