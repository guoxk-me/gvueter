import type { PermissionAction, PermissionSubject } from '@/features/roles/types'
import type { ApiResponse } from '@/lib/http'
import type { MockUser } from '@/mocks/data/users'
import type {
  AuthenticatedPrincipal,
  CaptchaChallenge,
  ChangePasswordInput,
  LoginInput,
  LoginResponse,
  UpdateProfileInput,
} from '@/types/auth'
import { http, HttpResponse } from 'msw'
import {
  CHANGE_PASSWORD_INPUT_SCHEMA,
  FORGOT_PASSWORD_INPUT_SCHEMA,
  LOGIN_INPUT_SCHEMA,
  RESET_PASSWORD_INPUT_SCHEMA,
  UPDATE_PROFILE_INPUT_SCHEMA,
} from '@/features/account/auth-api-contracts'
import { isStrongPassword } from '@/features/account/password-strength'
import { getRoleAuthorizationSnapshot, getRolePermissions } from '@/features/roles/role-policy'
import { recordMockLoginActivity } from '@/mocks/data/dashboard'
import { resetMockSsoTickets } from '@/mocks/data/sso'
import {
  generateMockToken,
  mockUsers,
  readMockTokenSession,
  resetMockTokenSessions,
  revokeMockToken,
  revokeMockUserSessions,
} from '@/mocks/data/users'
import { readMockJsonBody } from '@/mocks/request-validation'
import { NO_STORE_RESPONSE_HEADERS } from '@/mocks/response-headers'

const ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24
const CAPTCHA_LIFETIME_MS = 5 * 60 * 1000
const MAX_LOGIN_FAILURES = 5
const LOGIN_LOCK_DURATION_MS = 30 * 1000
const MAX_CAPTCHA_RECORDS = 200
const MAX_LOGIN_FAILURE_RECORDS = 500
const MAX_RESET_TOKEN_RECORDS = 500
const INVALID_CREDENTIALS_MESSAGE = '邮箱或密码不正确'
const MOCK_TENANT_MEMBERSHIPS = new Set(['tenant-demo', 'tenant-a', 'tenant-b'])

interface CaptchaRecord {
  answer: string
  expiresAt: number
}

interface LoginFailureRecord {
  count: number
  lockedUntil: number
}

export type MockAuthentication =
  | { isAuthenticated: true; user: MockUser; tenantId: string | null }
  | { isAuthenticated: false; response: Response }

const captchaRecords = new Map<string, CaptchaRecord>()
const loginFailureRecords = new Map<string, LoginFailureRecord>()
const resetTokenStore = new Map<string, { token: string; expiry: number }>()

function pruneAuthenticationRecords(now = Date.now()): void {
  for (const [captchaId, captcha] of captchaRecords) {
    if (captcha.expiresAt <= now) captchaRecords.delete(captchaId)
  }
  for (const [failureKey, failure] of loginFailureRecords) {
    if (failure.lockedUntil > 0 && failure.lockedUntil <= now)
      loginFailureRecords.delete(failureKey)
  }
  for (const [email, resetToken] of resetTokenStore) {
    if (resetToken.expiry <= now) resetTokenStore.delete(email)
  }
}

function enforceAuthenticationRecordLimit<T>(records: Map<string, T>, maximumSize: number): void {
  while (records.size > maximumSize) {
    const oldestKey = records.keys().next().value
    if (!oldestKey) return
    records.delete(oldestKey)
  }
}

function getLoginFailureKey(email: string): string {
  return email.trim().toLowerCase()
}

function getLoginLockResponse(email: string): Response | undefined {
  const failureKey = getLoginFailureKey(email)
  const failureRecord = loginFailureRecords.get(failureKey)
  if (!failureRecord || failureRecord.lockedUntil === 0) return undefined

  if (failureRecord.lockedUntil <= Date.now()) {
    // AI modified: an expired lock starts a fresh failure window instead of re-locking forever.
    loginFailureRecords.delete(failureKey)
    return undefined
  }

  const retryAfterSeconds = Math.ceil((failureRecord.lockedUntil - Date.now()) / 1000)
  return HttpResponse.json<ApiResponse<{ retryAfterSeconds: number }>>(
    {
      code: 'LOGIN_LOCKED',
      message: `登录尝试过多，请在 ${retryAfterSeconds} 秒后重试`,
      data: { retryAfterSeconds },
    },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

function recordLoginFailure(email: string): Response | undefined {
  pruneAuthenticationRecords()
  const key = getLoginFailureKey(email)
  const previousRecord = loginFailureRecords.get(key)
  const count = (previousRecord?.count ?? 0) + 1
  const lockedUntil = count >= MAX_LOGIN_FAILURES ? Date.now() + LOGIN_LOCK_DURATION_MS : 0
  loginFailureRecords.set(key, { count, lockedUntil })
  // AI modified: arbitrary login identifiers cannot grow the in-memory demo security state without bound.
  enforceAuthenticationRecordLimit(loginFailureRecords, MAX_LOGIN_FAILURE_RECORDS)
  return lockedUntil ? getLoginLockResponse(email) : undefined
}

function getPublicUser(user: MockUser) {
  const { password: _password, ...publicUser } = user
  return publicUser
}

export function getMockAuthenticatedPrincipal(
  user: MockUser,
  tenantId: string | null,
): AuthenticatedPrincipal {
  // AI modified: Mock endpoints reproduce the production principal snapshot instead of leaking client role policy.
  return {
    tenantId,
    user: getPublicUser(user),
    authorization: getRoleAuthorizationSnapshot(user.role),
  }
}

function getAuthorizationFailure(
  code: string,
  message: string,
  status: 401 | 403 = 401,
): MockAuthentication {
  return {
    isAuthenticated: false,
    response: HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status }),
  }
}

export function authenticateMockRequest(request: Request): MockAuthentication {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return getAuthorizationFailure('UNAUTHORIZED', '未授权，请先登录')
  }

  const session = readMockTokenSession(authorization.slice('Bearer '.length))
  if (session.status === 'expired') {
    return getAuthorizationFailure('TOKEN_EXPIRED', 'Token 已过期，请重新登录')
  }
  if (session.status === 'invalid') {
    return getAuthorizationFailure('INVALID_TOKEN', 'Token 无效，请重新登录')
  }

  const user = mockUsers.find((candidate) => candidate.id === session.userId)
  if (!user) return getAuthorizationFailure('INVALID_TOKEN', 'Token 对应的用户不存在')
  if (user.status !== 'active')
    return getAuthorizationFailure('ACCOUNT_SUSPENDED', '账号已停用', 403)
  return { isAuthenticated: true, user, tenantId: session.tenantId }
}

/** Reserved for platform policy and security operations outside the delegable business matrix. */
export function authorizeMockAdmin(request: Request): MockAuthentication {
  const authentication = authenticateMockRequest(request)
  if (!authentication.isAuthenticated || authentication.user.role === 'admin') {
    return authentication
  }

  // AI modified: protected mock writes demonstrate that hidden buttons are not authorization.
  return getAuthorizationFailure('FORBIDDEN', '当前账号没有执行此操作的权限', 403)
}

export function authorizeMockPermission(
  request: Request,
  action: PermissionAction,
  subject: PermissionSubject,
): MockAuthentication {
  const authentication = authenticateMockRequest(request)
  if (!authentication.isAuthenticated) {
    return authentication
  }

  const hasPermission = getRolePermissions(authentication.user.role).some(
    (permission) => permission.action === action && permission.subject === subject,
  )
  if (hasPermission) {
    return authentication
  }

  // AI modified: every mock action enforces the same editable role policy as CASL.
  return getAuthorizationFailure('FORBIDDEN', '当前账号没有执行此操作的权限', 403)
}

// ── GET /api/auth/captcha ────────────────────────────────────────────────────

export const captchaHandler = http.get('/api/auth/captcha', () => {
  pruneAuthenticationRecords()
  const left = Math.floor(Math.random() * 7) + 2
  const right = Math.floor(Math.random() * 7) + 2
  const captchaId = crypto.randomUUID()
  const expiresAt = Date.now() + CAPTCHA_LIFETIME_MS
  captchaRecords.set(captchaId, { answer: String(left + right), expiresAt })
  // AI modified: expired and oldest challenges are bounded like a production challenge store.
  enforceAuthenticationRecordLimit(captchaRecords, MAX_CAPTCHA_RECORDS)

  return HttpResponse.json<ApiResponse<CaptchaChallenge>>({
    code: 0,
    message: 'success',
    data: { captchaId, challenge: `${left} + ${right} = ?`, expiresAt },
  })
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export const loginHandler = http.post<never, LoginInput>('/api/auth/login', async ({ request }) => {
  const requestBody = await readMockJsonBody(request, LOGIN_INPUT_SCHEMA)
  if (!requestBody.isValid) return requestBody.response
  const input = requestBody.body
  const { email, password } = input
  const canonicalEmail = email.trim().toLowerCase()

  const existingLockResponse = getLoginLockResponse(email)
  if (existingLockResponse) return existingLockResponse

  if (!input.captchaId || !input.captchaCode) {
    // AI modified: password clients cannot bypass the challenge by omitting both captcha fields.
    return HttpResponse.json<ApiResponse<null>>(
      { code: 'CAPTCHA_REQUIRED', message: '请先完成验证码校验', data: null },
      { status: 400 },
    )
  }

  const captcha = captchaRecords.get(input.captchaId)
  const isCaptchaValid =
    captcha && captcha.expiresAt > Date.now() && captcha.answer === input.captchaCode.trim()
  captchaRecords.delete(input.captchaId)
  if (!isCaptchaValid) {
    const lockResponse = recordLoginFailure(email)
    if (lockResponse) return lockResponse
    return HttpResponse.json<ApiResponse<null>>(
      { code: 'INVALID_CAPTCHA', message: '验证码错误或已过期', data: null },
      { status: 400 },
    )
  }

  const found = mockUsers.find(
    (user) => user.email.toLowerCase() === canonicalEmail && user.password === password,
  )

  if (!found || found.status !== 'active') {
    const lockResponse = recordLoginFailure(email)
    if (lockResponse) return lockResponse
    // AI modified: one response hides whether an account is absent, suspended, or has a wrong password.
    return HttpResponse.json<ApiResponse<null>>(
      { code: 'INVALID_CREDENTIALS', message: INVALID_CREDENTIALS_MESSAGE, data: null },
      { status: 401 },
    )
  }

  const authoritativeTenantId = input.tenantId ?? null
  if (authoritativeTenantId && !MOCK_TENANT_MEMBERSHIPS.has(authoritativeTenantId)) {
    // AI modified: a browser tenant hint cannot establish membership the Mock server has not granted.
    return HttpResponse.json<ApiResponse<null>>(
      { code: 'TENANT_ACCESS_DENIED', message: '当前账号不能访问所选租户', data: null },
      { status: 403 },
    )
  }

  const principal = getMockAuthenticatedPrincipal(found, authoritativeTenantId)
  loginFailureRecords.delete(getLoginFailureKey(email))
  recordMockLoginActivity(principal.user.id)
  const token = generateMockToken(
    principal.user.id,
    ACCESS_TOKEN_LIFETIME_SECONDS,
    principal.tenantId,
  )

  return HttpResponse.json<ApiResponse<LoginResponse>>(
    {
      code: 0,
      message: 'success',
      data: {
        token,
        expiresAt: Date.now() + ACCESS_TOKEN_LIFETIME_SECONDS * 1000,
        ...principal,
      },
    },
    { headers: NO_STORE_RESPONSE_HEADERS },
  )
})

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

export const logoutHandler = http.post('/api/auth/logout', ({ request }) => {
  const authentication = authenticateMockRequest(request)
  if (!authentication.isAuthenticated) return authentication.response
  const authorization = request.headers.get('Authorization')
  if (authorization?.startsWith('Bearer ')) revokeMockToken(authorization.slice('Bearer '.length))

  // AI modified: logout invalidates the exact opaque Mock session instead of trusting client cleanup.
  return HttpResponse.json<ApiResponse<null>>({
    code: 0,
    message: 'ok',
    data: null,
  })
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

export const meHandler = http.get('/api/auth/me', ({ request }) => {
  const authentication = authenticateMockRequest(request)
  if (!authentication.isAuthenticated) return authentication.response

  return HttpResponse.json<ApiResponse<AuthenticatedPrincipal>>(
    {
      code: 0,
      message: 'success',
      data: getMockAuthenticatedPrincipal(authentication.user, authentication.tenantId),
    },
    { headers: NO_STORE_RESPONSE_HEADERS },
  )
})

/** 生成随机重置 token */
function generateResetToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

export const forgotPasswordHandler = http.post('/api/auth/forgot-password', async ({ request }) => {
  const requestBody = await readMockJsonBody(request, FORGOT_PASSWORD_INPUT_SCHEMA)
  if (!requestBody.isValid) return requestBody.response
  const { email } = requestBody.body
  const canonicalEmail = email.trim().toLowerCase()
  const userExists = mockUsers.find((user) => user.email.toLowerCase() === canonicalEmail)

  const token = generateResetToken()
  if (userExists) {
    // AI modified: unknown accounts receive the same response without creating a reset credential.
    resetTokenStore.delete(userExists.email)
    resetTokenStore.set(userExists.email, { token, expiry: Date.now() + 30 * 60 * 1000 })
    // AI modified: reset requests cannot grow browser-memory credential state without bound.
    pruneAuthenticationRecords()
    enforceAuthenticationRecordLimit(resetTokenStore, MAX_RESET_TOKEN_RECORDS)
  }

  return HttpResponse.json<ApiResponse<null>>({
    code: 0,
    message: 'ok',
    data: null,
  })
})

// ── POST /api/auth/reset-password ────────────────────────────────────────────

export const resetPasswordHandler = http.post('/api/auth/reset-password', async ({ request }) => {
  const requestBody = await readMockJsonBody(request, RESET_PASSWORD_INPUT_SCHEMA)
  if (!requestBody.isValid) return requestBody.response
  const { token, newPassword } = requestBody.body

  if (!isStrongPassword(newPassword)) {
    return HttpResponse.json<ApiResponse<null>>(
      { code: 'WEAK_PASSWORD', message: '新密码至少 8 位，并包含大小写字母和数字', data: null },
      { status: 400 },
    )
  }

  // 从内存 store 中查找匹配的 token
  let matchedEmail: string | null = null
  for (const [email, record] of resetTokenStore.entries()) {
    if (record.token === token) {
      if (Date.now() > record.expiry) {
        resetTokenStore.delete(email)
        return HttpResponse.json<ApiResponse<null>>(
          { code: 'INVALID_RESET_TOKEN', message: '重置链接已过期，请重新申请', data: null },
          { status: 400 },
        )
      }
      matchedEmail = email
      break
    }
  }

  if (!matchedEmail) {
    return HttpResponse.json<ApiResponse<null>>(
      // AI modified: reset credentials are distinct from access tokens and cannot end an active session.
      { code: 'INVALID_RESET_TOKEN', message: '重置链接无效，请重新申请', data: null },
      { status: 400 },
    )
  }

  // 更新 mockUsers 中的密码
  const user = mockUsers.find((u) => u.email === matchedEmail)
  if (user) {
    user.password = newPassword
    // AI modified: a password reset revokes every previously issued Mock session for that user.
    revokeMockUserSessions(user.id)
  }

  resetTokenStore.delete(matchedEmail)

  return HttpResponse.json<ApiResponse<null>>({
    code: 0,
    message: 'ok',
    data: null,
  })
})

// ── POST /api/auth/change-password ───────────────────────────────────────────

export const changePasswordHandler = http.post<never, ChangePasswordInput>(
  '/api/auth/change-password',
  async ({ request }) => {
    const authentication = authenticateMockRequest(request)
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, CHANGE_PASSWORD_INPUT_SCHEMA)
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    if (authentication.user.password !== input.currentPassword) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'WRONG_PASSWORD', message: '当前密码不正确', data: null },
        { status: 400 },
      )
    }
    if (input.currentPassword === input.newPassword) {
      // AI modified: the API repeats the UI rule so direct requests cannot reuse the current password.
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'PASSWORD_UNCHANGED', message: '新密码不能与当前密码相同', data: null },
        { status: 400 },
      )
    }
    if (!isStrongPassword(input.newPassword)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'WEAK_PASSWORD', message: '新密码至少 8 位，并包含大小写字母和数字', data: null },
        { status: 400 },
      )
    }

    authentication.user.password = input.newPassword
    const authorization = request.headers.get('Authorization')
    const currentToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined
    // AI modified: password changes revoke other Mock sessions without stranding the successful caller.
    revokeMockUserSessions(authentication.user.id, currentToken)
    return HttpResponse.json<ApiResponse<null>>({
      code: 0,
      message: 'updated',
      data: null,
    })
  },
)

// ── PUT /api/auth/profile ────────────────────────────────────────────────────

export const updateProfileHandler = http.put<never, UpdateProfileInput>(
  '/api/auth/profile',
  async ({ request }) => {
    const authentication = authenticateMockRequest(request)
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, UPDATE_PROFILE_INPUT_SCHEMA)
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    const name = input.name.trim()
    const email = input.email.trim().toLowerCase()
    if (!name || !email) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'INVALID_PROFILE', message: '姓名和邮箱不能为空', data: null },
        { status: 400 },
      )
    }

    const hasDuplicateEmail = mockUsers.some(
      (user) => user.id !== authentication.user.id && user.email.toLowerCase() === email,
    )
    if (hasDuplicateEmail) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'EMAIL_EXISTS', message: '该邮箱已被使用', data: null },
        { status: 409 },
      )
    }

    authentication.user.name = name
    authentication.user.email = email
    return HttpResponse.json<ApiResponse<ReturnType<typeof getPublicUser>>>({
      code: 0,
      message: 'updated',
      data: getPublicUser(authentication.user),
    })
  },
)

export const authHandlers = [
  captchaHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  changePasswordHandler,
  updateProfileHandler,
]

export function resetMockAuthentication(): void {
  // AI modified: isolate security counters and one-time tokens between tests and demo resets.
  captchaRecords.clear()
  loginFailureRecords.clear()
  resetTokenStore.clear()
  resetMockTokenSessions()
  resetMockSsoTickets()
}
