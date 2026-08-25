import type {
  AdminUser,
  UserImportIssue,
  UserImportResponse,
  UserInput,
  UserListResponse,
  UserRole,
  UserSortField,
  UserStatus,
} from '@/features/users/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { isStrongPassword } from '@/features/account/password-strength'
import { getDataScopeDepartmentIds, isUserInDataScope } from '@/features/roles/data-scope'
import { getRoleDataScope, getRolePermissions } from '@/features/roles/role-policy'
import { applyUploadPolicy } from '@/features/uploads/upload-policy'
import { USER_ROLES, USER_STATUSES } from '@/features/users/types'
import { USER_INPUT_SCHEMA } from '@/features/users/user-api-contracts'
import { USER_IMPORT_UPLOAD_RULES } from '@/features/users/user-import-policy'
import { maskEmail } from '@/features/users/user-privacy'
import { getSafeFileName } from '@/lib/http'
import { getMockUploadPolicy } from '@/mocks/data/upload-config'
import { mockUsers, revokeMockUserSessions } from '@/mocks/data/users'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'
import { getMockDepartmentSnapshot } from './departments'
import { recordMockOperation } from './operation-logs'

const MAX_USER_IMPORT_ROWS = 200
const MAX_MOCK_USERS = 500
const userImportHeaders = ['name', 'email', 'role', 'status'] as const
const optionalUserImportHeader = 'createdat'
const userImportMimeTypes = new Set([
  'application/csv',
  'application/octet-stream',
  'application/vnd.ms-excel',
  'text/csv',
])

interface CsvRecord {
  row: number
  fields: string[]
}

interface AcceptedUserImport {
  name: string
  email: string
  role: UserRole
  status: UserStatus
}

function toAdminUser(user: (typeof mockUsers)[number], canReadSensitiveFields = true): AdminUser {
  const { password: _password, ...adminUser } = user
  if (!canReadSensitiveFields) {
    const {
      avatar: _avatar,
      departmentId: _departmentId,
      departmentPath: _departmentPath,
      ...visibleUser
    } = adminUser
    // AI modified: read-only roles receive only a masked contact identifier at the API boundary.
    return { ...visibleUser, email: maskEmail(adminUser.email) }
  }
  return adminUser
}

function findMockUser(userId: string | readonly string[]): (typeof mockUsers)[number] | undefined {
  const id = Number(userId)
  return Number.isInteger(id) ? mockUsers.find(user => user.id === id) : undefined
}

const userSortFields: readonly UserSortField[] = ['createdAt', 'email', 'name', 'role', 'status']

function isUserSortField(value: string | null): value is UserSortField {
  return value !== null && userSortFields.includes(value as UserSortField)
}

function getUserImportFailure(message: string, code: string, status = 400) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole)
}

function isUserStatus(value: string): value is UserStatus {
  return USER_STATUSES.includes(value as UserStatus)
}

function readCsvRecords(csvText: string): CsvRecord[] | undefined {
  const records: CsvRecord[] = []
  let fields: string[] = []
  let field = ''
  let state: 'plain' | 'quoted' | 'quoted-closed' = 'plain'
  let currentRow = 1
  let recordRow = 1

  const finishRecord = (): void => {
    fields.push(field)
    records.push({ row: recordRow, fields })
    fields = []
    field = ''
    state = 'plain'
  }

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]!
    const nextCharacter = csvText[index + 1]

    if (state === 'quoted') {
      if (character === '"' && nextCharacter === '"') {
        field += '"'
        index += 1
      }
      else if (character === '"') {
        state = 'quoted-closed'
      }
      else {
        field += character
        if (character === '\n')
          currentRow += 1
      }
      continue
    }

    if (character === ',') {
      fields.push(field)
      field = ''
      state = 'plain'
      continue
    }

    if (character === '\r' || character === '\n') {
      if (character === '\r' && nextCharacter === '\n')
        index += 1
      finishRecord()
      currentRow += 1
      recordRow = currentRow
      continue
    }

    if (state === 'quoted-closed')
      return undefined

    if (character === '"') {
      if (field.length > 0)
        return undefined
      state = 'quoted'
      continue
    }

    field += character
  }

  if (state === 'quoted')
    return undefined
  if (field.length > 0 || fields.length > 0)
    finishRecord()
  return records
}

function hasUnsafeSpreadsheetValue(value: string): boolean {
  const firstMeaningfulCharacter = [...value].find((character) => {
    const characterCode = character.charCodeAt(0)
    return characterCode > 32 && character !== '\u00A0' && character !== '\uFEFF'
  })
  return Boolean(firstMeaningfulCharacter && '=+-@'.includes(firstMeaningfulCharacter))
}

function isValidUserImportEmail(email: string): boolean {
  if (
    email.length === 0
    || email.length > 254
    || [...email].some(character => character.charCodeAt(0) < 32)
  ) {
    return false
  }

  const segments = email.split('@')
  if (segments.length !== 2)
    return false
  const [mailbox = '', domain = ''] = segments
  const domainLabels = domain.split('.')
  return (
    mailbox.length > 0
    && !/\s/.test(mailbox)
    && domainLabels.length >= 2
    && domainLabels.every(label => label.length > 0 && !/\s/.test(label))
  )
}

function canAssignUserRoles(role: UserRole): boolean {
  return getRolePermissions(role).some(
    permission => permission.action === 'update' && permission.subject === 'RolePolicy',
  )
}

function canReadSensitiveUserFields(role: UserRole): boolean {
  return getRolePermissions(role).some(
    permission => permission.action === 'update' && permission.subject === 'User',
  )
}

function hasAnotherActiveAdministrator(userId: number): boolean {
  return mockUsers.some(
    user => user.id !== userId && user.role === 'admin' && user.status === 'active',
  )
}

function removesActiveAdministrator(user: (typeof mockUsers)[number], input: UserInput): boolean {
  return (
    user.role === 'admin'
    && user.status === 'active'
    && (input.role !== 'admin' || input.status !== 'active')
  )
}

function getUserImportIssue(
  record: CsvRecord,
  expectedColumnCount: number,
): UserImportIssue | undefined {
  if (record.fields.length !== expectedColumnCount)
    return { row: record.row, code: 'INVALID_COLUMN_COUNT' }

  const [requestedName = '', requestedEmail = '', requestedRole = '', requestedStatus = '']
    = record.fields
  const name = requestedName.trim()
  const email = requestedEmail.trim().toLowerCase()
  const role = requestedRole.trim().toLowerCase()
  const status = requestedStatus.trim().toLowerCase()

  if (!name || name.length > 80 || [...name].some(character => character.charCodeAt(0) < 32))
    return { row: record.row, code: 'INVALID_NAME' }
  if (hasUnsafeSpreadsheetValue(name))
    return { row: record.row, code: 'UNSAFE_SPREADSHEET_VALUE' }
  if (!isValidUserImportEmail(email))
    return { row: record.row, code: 'INVALID_EMAIL' }
  if (!isUserRole(role))
    return { row: record.row, code: 'INVALID_ROLE' }
  if (!isUserStatus(status))
    return { row: record.row, code: 'INVALID_STATUS' }
  return undefined
}

export const listUsersHandler = http.get('/api/users', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'User')
  if (!authentication.isAuthenticated)
    return authentication.response

  const dataScope = getRoleDataScope(authentication.user.role)
  const allowedDepartmentIds = getDataScopeDepartmentIds(
    dataScope,
    authentication.user,
    getMockDepartmentSnapshot(),
  )

  const url = new URL(request.url)
  const keyword = url.searchParams.get('keyword')?.trim().toLowerCase() ?? ''
  const role = url.searchParams.get('role') as UserRole | null
  const status = url.searchParams.get('status') as UserStatus | null
  const page = Math.max(Number(url.searchParams.get('page') ?? 1) || 1, 1)
  const pageSize = Math.min(Math.max(Number(url.searchParams.get('pageSize') ?? 10) || 10, 1), 100)
  const requestedSortField = url.searchParams.get('sortField')
  const sortField = isUserSortField(requestedSortField) ? requestedSortField : 'createdAt'
  const sortDirection = url.searchParams.get('sortDirection') === 'asc' ? 1 : -1
  const canReadSensitiveFields = canReadSensitiveUserFields(authentication.user.role)

  const matchingUsers = mockUsers
    // AI modified: MSW applies the current hierarchy-backed data scope before client filters.
    .filter(user => isUserInDataScope(dataScope, authentication.user, user, allowedDepartmentIds))
    .filter((user) => {
      const isKeywordMatch
        = !keyword
          || user.name.toLowerCase().includes(keyword)
          || (canReadSensitiveFields && user.email.toLowerCase().includes(keyword))
      // AI modified: masked-list roles cannot use totals as an oracle for hidden email addresses.
      const isRoleMatch = !role || user.role === role
      const isStatusMatch = !status || user.status === status
      return isKeywordMatch && isRoleMatch && isStatusMatch
    })
    .sort(
      (left, right) =>
        String(left[sortField]).localeCompare(String(right[sortField])) * sortDirection,
    )
  const startIndex = (page - 1) * pageSize
  const items = matchingUsers
    .slice(startIndex, startIndex + pageSize)
    .map(user => toAdminUser(user, canReadSensitiveFields))

  return HttpResponse.json<ApiResponse<UserListResponse>>({
    code: 0,
    message: 'success',
    data: { items, total: matchingUsers.length, page, pageSize },
  })
})

export const createUserHandler = http.post<never, Record<string, unknown>>(
  '/api/users',
  async ({ request }) => {
    // AI modified: User writes honor action grants while record mutations still enforce data scope.
    const authentication = authorizeMockPermission(request, 'create', 'User')
    if (!authentication.isAuthenticated)
      return authentication.response

    const requestBody = await readMockJsonBody(request, USER_INPUT_SCHEMA)
    if (!requestBody.isValid)
      return requestBody.response
    const input = requestBody.body
    if (!input.temporaryPassword || !isStrongPassword(input.temporaryPassword))
      return getUserImportFailure('临时密码强度不足', 'WEAK_TEMPORARY_PASSWORD')
    if (input.role !== 'viewer' && !canAssignUserRoles(authentication.user.role)) {
      return getUserImportFailure('当前账号不能分配高权限角色', 'ROLE_ASSIGNMENT_FORBIDDEN', 403)
    }
    const email = input.email.trim().toLowerCase()

    if (mockUsers.some(user => user.email.toLowerCase() === email)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'EMAIL_EXISTS', message: '该邮箱已被使用', data: null },
        { status: 409 },
      )
    }
    if (mockUsers.length >= MAX_MOCK_USERS) {
      // AI modified: mutable demo records are capped so repeated writes cannot exhaust browser memory.
      return getUserImportFailure('用户数量已达到演示环境上限', 'USER_CAPACITY_REACHED', 409)
    }

    const user = {
      id: Math.max(...mockUsers.map(item => item.id), 0) + 1,
      name: input.name.trim(),
      email,
      password: input.temporaryPassword,
      role: input.role,
      status: input.status,
      departmentId: authentication.user.departmentId,
      departmentPath: authentication.user.departmentPath,
      createdAt: new Date().toISOString(),
    } satisfies (typeof mockUsers)[number]
    mockUsers.push(user)
    recordMockOperation(authentication.user, {
      action: 'create',
      resource: 'user',
      summary: `Created user ${user.id}.`,
    })

    return HttpResponse.json<ApiResponse<AdminUser>>({
      code: 0,
      message: 'created',
      data: toAdminUser(user),
    })
  },
)

export const importUsersHandler = http.post('/api/users/import', async ({ request }) => {
  const authentication = authorizeMockPermission(request, 'create', 'User')
  if (!authentication.isAuthenticated)
    return authentication.response
  const effectiveUploadPolicy = applyUploadPolicy(getMockUploadPolicy(), USER_IMPORT_UPLOAD_RULES)

  const encodedFileName = request.headers.get('X-File-Name')
  if (!encodedFileName)
    return getUserImportFailure('请选择 CSV 文件', 'USER_IMPORT_FILE_REQUIRED')

  let requestedFileName: string
  try {
    requestedFileName = decodeURIComponent(encodedFileName)
  }
  catch {
    return getUserImportFailure('文件名无效', 'INVALID_USER_IMPORT_FILE_NAME')
  }
  const fileName = getSafeFileName(requestedFileName)
  if (!fileName || !fileName.toLowerCase().endsWith('.csv'))
    return getUserImportFailure('仅支持 CSV 文件', 'UNSUPPORTED_USER_IMPORT_FILE_TYPE', 415)
  if (!effectiveUploadPolicy.allowedExtensions.includes('csv')) {
    // AI modified: the global policy can disable CSV import without exposing storage configuration.
    return getUserImportFailure('当前上传策略未启用 CSV', 'USER_IMPORT_EXTENSION_DISABLED', 415)
  }

  const mimeType = request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (!userImportMimeTypes.has(mimeType))
    return getUserImportFailure('仅支持 CSV 文件', 'UNSUPPORTED_USER_IMPORT_FILE_TYPE', 415)

  const uploadedBytes = await request.arrayBuffer()
  if (uploadedBytes.byteLength === 0)
    return getUserImportFailure('CSV 文件不能为空', 'USER_IMPORT_FILE_REQUIRED')
  if (uploadedBytes.byteLength > effectiveUploadPolicy.maxFileSizeBytes)
    return getUserImportFailure('CSV 文件超过 256 KB', 'USER_IMPORT_FILE_TOO_LARGE', 413)

  let csvText: string
  try {
    csvText = new TextDecoder('utf-8', { fatal: true }).decode(uploadedBytes).replace(/^\uFEFF/, '')
  }
  catch {
    return getUserImportFailure('CSV 文件必须使用 UTF-8 编码', 'INVALID_USER_IMPORT_ENCODING')
  }

  const records = readCsvRecords(csvText)
  if (!records)
    return getUserImportFailure('CSV 文件格式无效', 'INVALID_USER_IMPORT_CSV')
  const header = records[0]?.fields.map(field => field.trim().toLowerCase())
  const hasRequiredHeaders = header
    ?.slice(0, userImportHeaders.length)
    .every((field, index) => field === userImportHeaders[index])
  const hasOptionalCreatedAt
    = header?.length === userImportHeaders.length + 1
      && header[userImportHeaders.length] === optionalUserImportHeader
  if (
    !header
    || !hasRequiredHeaders
    || (header.length !== userImportHeaders.length && !hasOptionalCreatedAt)
  ) {
    return getUserImportFailure(
      'CSV 表头必须为 name,email,role,status，可附加 createdAt',
      'INVALID_USER_IMPORT_HEADER',
    )
  }

  const userRecords = records
    .slice(1)
    .filter(record => record.fields.some(field => field.trim()))
  if (userRecords.length === 0)
    return getUserImportFailure('CSV 文件没有可导入的用户', 'USER_IMPORT_EMPTY')
  if (userRecords.length > MAX_USER_IMPORT_ROWS)
    return getUserImportFailure('一次最多导入 200 位用户', 'USER_IMPORT_ROW_LIMIT', 413)

  const existingEmails = new Set(mockUsers.map(user => user.email.toLowerCase()))
  const issues: UserImportIssue[] = []
  const acceptedUsers: AcceptedUserImport[] = []
  const hasRoleAssignmentPermission = canAssignUserRoles(authentication.user.role)

  // AI modified: validate the complete CSV before committing accepted rows to the mock database.
  for (const record of userRecords) {
    const issue = getUserImportIssue(record, header.length)
    if (issue) {
      issues.push(issue)
      continue
    }

    const [requestedName = '', requestedEmail = '', requestedRole = '', requestedStatus = '']
      = record.fields
    const email = requestedEmail.trim().toLowerCase()
    if (existingEmails.has(email)) {
      issues.push({ row: record.row, code: 'DUPLICATE_EMAIL' })
      continue
    }

    const role = requestedRole.trim().toLowerCase()
    const status = requestedStatus.trim().toLowerCase()
    if (!isUserRole(role) || !isUserStatus(status))
      continue
    if (role !== 'viewer' && !hasRoleAssignmentPermission) {
      issues.push({ row: record.row, code: 'ROLE_ASSIGNMENT_FORBIDDEN' })
      continue
    }
    acceptedUsers.push({ name: requestedName.trim(), email, role, status })
    existingEmails.add(email)
  }

  if (mockUsers.length + acceptedUsers.length > MAX_MOCK_USERS) {
    // AI modified: imports remain atomic when the bounded Mock user store has insufficient capacity.
    return getUserImportFailure('导入后用户数量将超过演示环境上限', 'USER_CAPACITY_REACHED', 409)
  }

  let nextUserId = Math.max(...mockUsers.map(user => user.id), 0) + 1
  for (const user of acceptedUsers) {
    mockUsers.push({
      id: nextUserId,
      ...user,
      password: crypto.randomUUID(),
      departmentId: authentication.user.departmentId,
      departmentPath: authentication.user.departmentPath,
      createdAt: new Date().toISOString(),
    })
    nextUserId += 1
  }

  if (acceptedUsers.length > 0) {
    recordMockOperation(authentication.user, {
      action: 'import',
      resource: 'user',
      summary: `Imported ${acceptedUsers.length} users and skipped ${issues.length} rows.`,
    })
  }

  const response: UserImportResponse = {
    createdCount: acceptedUsers.length,
    skippedCount: issues.length,
    issues,
  }
  return HttpResponse.json<ApiResponse<UserImportResponse>>({
    code: 0,
    message: 'imported',
    data: response,
  })
})

export const updateUserHandler = http.put<{ userId: string }, Record<string, unknown>>(
  '/api/users/:userId',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'User')
    if (!authentication.isAuthenticated)
      return authentication.response

    const user = findMockUser(params.userId)
    if (!user) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'USER_NOT_FOUND', message: '用户不存在', data: null },
        { status: 404 },
      )
    }
    const dataScope = getRoleDataScope(authentication.user.role)
    const allowedDepartmentIds = getDataScopeDepartmentIds(
      dataScope,
      authentication.user,
      getMockDepartmentSnapshot(),
    )
    if (!isUserInDataScope(dataScope, authentication.user, user, allowedDepartmentIds)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'FORBIDDEN', message: '当前账号不能修改数据范围外的用户', data: null },
        { status: 403 },
      )
    }

    const requestBody = await readMockJsonBody(request, USER_INPUT_SCHEMA)
    if (!requestBody.isValid)
      return requestBody.response
    const input = requestBody.body
    if (removesActiveAdministrator(user, input) && !hasAnotherActiveAdministrator(user.id)) {
      // AI modified: preserve at least one active administrator at the authoritative API boundary.
      return getUserImportFailure(
        '系统必须保留至少一个启用的管理员',
        'LAST_ACTIVE_ADMIN_REQUIRED',
        409,
      )
    }
    if (
      user.id === authentication.user.id
      && (input.role !== user.role || input.status !== user.status)
    ) {
      return getUserImportFailure(
        '当前账号不能修改自己的角色或状态',
        'SELF_SECURITY_CHANGE_FORBIDDEN',
        403,
      )
    }
    if (input.role !== user.role && !canAssignUserRoles(authentication.user.role)) {
      return getUserImportFailure('当前账号不能修改用户角色', 'ROLE_ASSIGNMENT_FORBIDDEN', 403)
    }
    const email = input.email.trim().toLowerCase()
    const hasDuplicateEmail = mockUsers.some(
      candidate => candidate.id !== user.id && candidate.email === email,
    )
    if (hasDuplicateEmail) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'EMAIL_EXISTS', message: '该邮箱已被使用', data: null },
        { status: 409 },
      )
    }

    user.name = input.name.trim()
    user.email = email
    user.role = input.role
    user.status = input.status
    // AI modified: suspending an account revokes prior Mock sessions so reactivation cannot revive them.
    if (user.status === 'suspended')
      revokeMockUserSessions(user.id)
    recordMockOperation(authentication.user, {
      action: 'update',
      resource: 'user',
      summary: `Updated user ${user.id}.`,
    })

    return HttpResponse.json<ApiResponse<AdminUser>>({
      code: 0,
      message: 'updated',
      data: toAdminUser(user),
    })
  },
)

export const deleteUserHandler = http.delete<{ userId: string }>(
  '/api/users/:userId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'User')
    if (!authentication.isAuthenticated)
      return authentication.response

    const user = findMockUser(params.userId)
    if (!user) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'USER_NOT_FOUND', message: '用户不存在', data: null },
        { status: 404 },
      )
    }
    const dataScope = getRoleDataScope(authentication.user.role)
    const allowedDepartmentIds = getDataScopeDepartmentIds(
      dataScope,
      authentication.user,
      getMockDepartmentSnapshot(),
    )
    if (!isUserInDataScope(dataScope, authentication.user, user, allowedDepartmentIds)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'FORBIDDEN', message: '当前账号不能删除数据范围外的用户', data: null },
        { status: 403 },
      )
    }
    if (
      user.role === 'admin'
      && user.status === 'active'
      && !hasAnotherActiveAdministrator(user.id)
    ) {
      return getUserImportFailure(
        '系统必须保留至少一个启用的管理员',
        'LAST_ACTIVE_ADMIN_REQUIRED',
        409,
      )
    }
    if (user.id === authentication.user.id) {
      // AI modified: administrators cannot accidentally delete the principal authorizing the request.
      return getUserImportFailure('当前账号不能删除自己', 'SELF_DELETE_FORBIDDEN', 403)
    }

    const index = mockUsers.indexOf(user)
    mockUsers.splice(index, 1)
    // AI modified: deleted identities cannot retain usable opaque Mock sessions.
    revokeMockUserSessions(user.id)
    recordMockOperation(authentication.user, {
      action: 'delete',
      resource: 'user',
      summary: `Deleted user ${user.id}.`,
    })
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const userHandlers = [
  listUsersHandler,
  createUserHandler,
  importUsersHandler,
  updateUserHandler,
  deleteUserHandler,
]
