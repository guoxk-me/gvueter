import type { ApiResponse } from '@/lib/http'
import type { SsoStartResponse } from '@/types/auth'
import { http, HttpResponse } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get, post } from '@/lib/http'
import {
  generateMockToken,
  mockUsers,
  readMockTokenSession,
  resetMockTokenSessions,
} from '@/mocks/data/users'
import { server } from '@/mocks/node'
import {
  AUTH_PROVIDER_STORAGE_KEY,
  AUTH_TENANT_STORAGE_KEY,
  AUTH_TOKEN_EXPIRY_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  useAuthStore,
} from '@/stores/auth'
import { getTestAuthorization, loginWithCaptcha, solveCaptchaChallenge } from './auth-test-helpers'

async function requestMockSsoTicket(returnTo = '/dashboard'): Promise<string> {
  const start = await post<SsoStartResponse>('/auth/sso/start', { returnTo })
  const callbackUrl = new URL(start.authorizationUrl)
  const ticket = new URLSearchParams(callbackUrl.hash.slice(1)).get('ticket')
  if (!ticket)
    throw new Error('Mock SSO callback did not contain a ticket fragment')
  return ticket
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('login()', () => {
    it('admin 账号登录成功，返回 token 和用户信息', async () => {
      const store = useAuthStore()

      const result = await loginWithCaptcha(store, 'admin@example.com', 'admin123')

      expect(result).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user).toMatchObject({
        email: 'admin@example.com',
        role: 'admin',
        name: '超级管理员',
      })
      expect(store.token).toBeTruthy()
      expect(store.authorization).toMatchObject({
        contractVersion: 1,
        policyVersion: expect.stringMatching(/^mock-policy-/),
        dataScope: { scope: 'all' },
      })
      expect(store.authorization?.grants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            permissionIdentifier: 'system:monitoring:read',
            action: 'read',
            subject: 'Monitoring',
          }),
        ]),
      )
      expect(sessionStorage.getItem('auth_token')).toBe(store.token)
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('auth_refresh_token')).toBeNull()
    })

    it('会话存储读取失败时降级为内存 Mock 会话', () => {
      resetMockTokenSessions()
      const originalGetItem = Storage.prototype.getItem
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
        this: Storage,
        key: string,
      ): string | null {
        if (key === '__gvueter_mock_token_sessions__') {
          throw new DOMException('Storage access denied', 'SecurityError')
        }
        return originalGetItem.call(this, key)
      })

      try {
        const token = generateMockToken(1)
        // AI modified: storage privacy failures cannot make the in-memory demo authentication unavailable.
        expect(readMockTokenSession(token)).toMatchObject({ status: 'valid', userId: 1 })
      }
      finally {
        getItemSpy.mockRestore()
      }
    })

    it('浏览器存储读取或清理受限时仍能创建匿名会话', async () => {
      const authStorageKeys = new Set([
        AUTH_TOKEN_STORAGE_KEY,
        AUTH_TOKEN_EXPIRY_STORAGE_KEY,
        AUTH_PROVIDER_STORAGE_KEY,
        AUTH_TENANT_STORAGE_KEY,
      ])
      const originalGetItem = Storage.prototype.getItem
      const originalRemoveItem = Storage.prototype.removeItem
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
        this: Storage,
        key: string,
      ): string | null {
        if (authStorageKeys.has(key))
          throw new DOMException('Storage access denied', 'SecurityError')
        return originalGetItem.call(this, key)
      })
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
        this: Storage,
        key: string,
      ): void {
        if (authStorageKeys.has(key))
          throw new DOMException('Storage access denied', 'SecurityError')
        originalRemoveItem.call(this, key)
      })

      const store = useAuthStore()
      await expect(store.restoreSession()).resolves.toBeUndefined()
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isSessionReady).toBe(true)
    })

    it('配额失败时回滚半写入凭据并保持匿名内存状态', async () => {
      const originalSetItem = Storage.prototype.setItem
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        this: Storage,
        key: string,
        storedValue: string,
      ): void {
        if (key === AUTH_PROVIDER_STORAGE_KEY)
          throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
        originalSetItem.call(this, key, storedValue)
      })
      const store = useAuthStore()

      const didAuthenticate = await loginWithCaptcha(store, 'admin@example.com', 'admin123')

      expect(didAuthenticate).toBe(false)
      expect(store.isAuthenticated).toBe(false)
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
      expect(sessionStorage.getItem(AUTH_TOKEN_EXPIRY_STORAGE_KEY)).toBeNull()
      expect(sessionStorage.getItem(AUTH_TENANT_STORAGE_KEY)).toBeNull()
    })

    it('editor 账号登录成功，角色为 editor', async () => {
      const store = useAuthStore()

      await loginWithCaptcha(store, 'editor@example.com', 'editor123')

      expect(store.user?.role).toBe('editor')
      expect(store.user?.name).toBe('内容编辑')
    })

    it('viewer 账号登录成功，角色为 viewer', async () => {
      const store = useAuthStore()

      await loginWithCaptcha(store, 'viewer@example.com', 'viewer123')

      expect(store.user?.role).toBe('viewer')
      expect(store.user?.name).toBe('只读访客')
    })

    it('停用账号使用正确凭据也得到通用认证失败', async () => {
      const store = useAuthStore()

      await expect(
        loginWithCaptcha(store, 'ran.zhou@example.com', 'viewer123'),
      ).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      })
      expect(store.isAuthenticated).toBe(false)
    })

    it('密码错误时返回不暴露账号状态的 401 错误', async () => {
      const store = useAuthStore()

      // AI modified: credential failures share one public response to prevent account enumeration.
      await expect(loginWithCaptcha(store, 'admin@example.com', 'wrongpassword')).rejects.toThrow(
        /邮箱或密码不正确/,
      )

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
    })

    it('已登录时另一项失败登录不会结束当前会话', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')
      const activeToken = store.token

      await expect(
        loginWithCaptcha(store, 'editor@example.com', 'wrongpassword'),
      ).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
      })

      // AI modified: an unauthenticated login attempt is independent from the active principal.
      expect(store.token).toBe(activeToken)
      expect(store.user).toMatchObject({ id: 1, role: 'admin' })
      expect(store.isAuthenticated).toBe(true)
    })

    it('不存在的账号返回相同认证失败', async () => {
      const store = useAuthStore()

      // AI modified: unknown accounts are indistinguishable from a wrong password.
      await expect(loginWithCaptcha(store, 'unknown@example.com', 'somepassword')).rejects.toThrow(
        /邮箱或密码不正确/,
      )

      expect(store.isAuthenticated).toBe(false)
    })

    it('可以通过 server.use() 覆盖 handler 模拟服务器错误', async () => {
      // 演示：在单个测试中临时覆盖 handler
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json<ApiResponse<null>>(
            { code: 500, message: '服务器内部错误', data: null },
            { status: 500 },
          )
        }),
      )

      const store = useAuthStore()
      // AI modified: assert ApiError business message instead of axios default status text.
      await expect(loginWithCaptcha(store, 'admin@example.com', 'admin123')).rejects.toThrow(
        /服务器内部错误/,
      )
    })

    it('拒绝把畸形登录成功响应写入会话', async () => {
      server.use(
        http.post('/api/auth/login', () =>
          HttpResponse.json<ApiResponse<unknown>>({
            code: 0,
            message: 'success',
            data: {
              token: 42,
              expiresAt: Date.now() + 60_000,
              user: { id: 1, role: 'admin' },
            },
          })),
      )
      const store = useAuthStore()

      // AI modified: a successful envelope is insufficient when its authentication payload is malformed.
      await expect(loginWithCaptcha(store, 'admin@example.com', 'admin123')).rejects.toMatchObject({
        code: 'INVALID_API_RESPONSE_DATA',
        category: 'contract',
      })
      expect(store.isAuthenticated).toBe(false)
      expect(sessionStorage.getItem('auth_token')).toBeNull()
    })

    it('支持验证码挑战并保留可选认证边界', async () => {
      const store = useAuthStore()
      const captcha = await store.getCaptcha()

      await store.login('admin@example.com', 'admin123', {
        captchaId: captcha.captchaId,
        captchaCode: solveCaptchaChallenge(captcha.challenge),
        provider: 'password',
        tenantId: 'tenant-demo',
      })

      expect(store.provider).toBe('password')
      expect(store.tenantId).toBe('tenant-demo')
      expect(store.principalId).toBe('tenant-demo:1')
      expect(captcha.expiresAt).toBeGreaterThan(Date.now())
    })

    it('拒绝把客户端租户提示当作已授权成员关系', async () => {
      const store = useAuthStore()

      await expect(
        loginWithCaptcha(store, 'admin@example.com', 'admin123', {
          tenantId: 'untrusted-tenant',
        }),
      ).rejects.toMatchObject({ code: 'TENANT_ACCESS_DENIED', status: 403 })

      // AI modified: a rejected tenant hint cannot leak into client session ownership.
      expect(store.tenantId).toBeNull()
      expect(sessionStorage.getItem(AUTH_TENANT_STORAGE_KEY)).toBeNull()
    })

    it('拒绝绕过密码登录验证码', async () => {
      const store = useAuthStore()

      await expect(store.login('admin@example.com', 'admin123')).rejects.toMatchObject({
        code: 'CAPTCHA_REQUIRED',
        status: 400,
      })
    })

    it('在 Mock 后端连续失败后限制登录', async () => {
      const store = useAuthStore()

      for (let attempt = 0; attempt < 4; attempt += 1) {
        await expect(
          loginWithCaptcha(store, 'admin@example.com', 'wrongpassword'),
        ).rejects.toMatchObject({
          code: 'INVALID_CREDENTIALS',
        })
      }

      await expect(
        loginWithCaptcha(store, 'admin@example.com', 'wrongpassword'),
      ).rejects.toMatchObject({
        code: 'LOGIN_LOCKED',
        status: 429,
      })
    })
  })

  describe('logout()', () => {
    it('登出后清除 token 和用户信息', async () => {
      const store = useAuthStore()

      await loginWithCaptcha(store, 'admin@example.com', 'admin123', {
        tenantId: 'tenant-demo',
      })
      expect(store.isAuthenticated).toBe(true)
      const revokedToken = store.token

      await store.logout()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.provider).toBe('password')
      expect(store.tenantId).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(sessionStorage.getItem('auth_token')).toBeNull()
      expect(sessionStorage.getItem('auth_provider')).toBeNull()
      expect(sessionStorage.getItem('auth_tenant_id')).toBeNull()

      sessionStorage.setItem('auth_token', revokedToken ?? '')
      await expect(get('/auth/me')).rejects.toMatchObject({
        code: 'INVALID_TOKEN',
        status: 401,
      })
    })

    it('存储清理受限时仍完成本地内存登出', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')
      const originalRemoveItem = Storage.prototype.removeItem
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
        this: Storage,
        key: string,
      ): void {
        if (
          [
            AUTH_TOKEN_STORAGE_KEY,
            AUTH_TOKEN_EXPIRY_STORAGE_KEY,
            AUTH_PROVIDER_STORAGE_KEY,
            AUTH_TENANT_STORAGE_KEY,
          ].includes(key)
        ) {
          throw new DOMException('Storage access denied', 'SecurityError')
        }
        originalRemoveItem.call(this, key)
      })

      await expect(store.logout()).resolves.toBeUndefined()
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('')
    })

    it('服务器撤销失败时仍完成本地登出', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')
      server.use(
        http.post('/api/auth/logout', () =>
          HttpResponse.json<ApiResponse<null>>(
            { code: 500, message: 'revocation unavailable', data: null },
            { status: 500 },
          )),
      )

      await expect(store.logout()).rejects.toMatchObject({ status: 500 })

      // AI modified: server revocation errors remain reportable without retaining local credentials.
      expect(store.isAuthenticated).toBe(false)
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(sessionStorage.getItem('auth_token')).toBeNull()
    })

    it('不会让旧登出响应清除随后建立的新会话', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')
      let markLogoutStarted = (): void => undefined
      let releaseLogout = (): void => undefined
      const logoutStarted = new Promise<void>(resolve => (markLogoutStarted = resolve))
      const logoutGate = new Promise<void>(resolve => (releaseLogout = resolve))
      server.use(
        http.post('/api/auth/logout', async () => {
          markLogoutStarted()
          await logoutGate
          return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'ok', data: null })
        }),
      )

      const pendingLogout = store.logout()
      await logoutStarted
      await loginWithCaptcha(store, 'editor@example.com', 'editor123')
      releaseLogout()
      await pendingLogout

      // AI modified: the later editor login owns the tab after the older logout finishes.
      expect(store.user).toMatchObject({ id: 2, role: 'editor' })
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('sSO', () => {
    it('discovers the safe public option and establishes a server-owned SSO session', async () => {
      const store = useAuthStore()

      await expect(store.getSsoConfiguration()).resolves.toEqual({
        isEnabled: true,
        providerName: 'Mock Enterprise SSO',
      })
      const ticket = await requestMockSsoTicket('/users?status=active')
      const redirectPath = await store.exchangeSsoTicket(ticket)

      expect(redirectPath).toBe('/users?status=active')
      expect(store.isAuthenticated).toBe(true)
      expect(store.provider).toBe('sso')
      expect(store.tenantId).toBe('tenant-demo')
      expect(store.principalId).toBe('tenant-demo:1')
      expect(store.user).toMatchObject({ id: 1, role: 'admin' })
      expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(store.token)
      expect(sessionStorage.getItem(AUTH_PROVIDER_STORAGE_KEY)).toBe('sso')
      expect(sessionStorage.getItem(AUTH_TENANT_STORAGE_KEY)).toBe('tenant-demo')
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('shares concurrent exchange calls and rejects ticket replay without a partial session', async () => {
      const store = useAuthStore()
      const ticket = await requestMockSsoTicket()

      const [firstRedirect, secondRedirect] = await Promise.all([
        store.exchangeSsoTicket(ticket),
        store.exchangeSsoTicket(ticket),
      ])
      expect(firstRedirect).toBe('/dashboard')
      expect(secondRedirect).toBe('/dashboard')

      sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_TOKEN_EXPIRY_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_PROVIDER_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_TENANT_STORAGE_KEY)
      setActivePinia(createPinia())
      const replayStore = useAuthStore()

      await expect(replayStore.exchangeSsoTicket(ticket)).rejects.toMatchObject({
        code: 'SSO_TICKET_INVALID',
        status: 400,
      })
      expect(replayStore.isAuthenticated).toBe(false)
      expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })

    it('does not let an SSO callback replace an active principal', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'editor@example.com', 'editor123')

      await expect(store.exchangeSsoTicket('mock-sso-ticket-unused')).rejects.toMatchObject({
        code: 'SSO_SESSION_ACTIVE',
        status: 409,
      })
      expect(store.user).toMatchObject({ id: 2, role: 'editor' })
      expect(store.provider).toBe('password')
    })

    it('keeps a newer password login when an older SSO exchange resolves late', async () => {
      const { password: _password, ...admin } = mockUsers[0]!
      let markExchangeStarted = (): void => undefined
      let releaseExchange = (): void => undefined
      const exchangeStarted = new Promise<void>(resolve => (markExchangeStarted = resolve))
      const exchangeGate = new Promise<void>(resolve => (releaseExchange = resolve))
      server.use(
        http.post('/api/auth/sso/exchange', async () => {
          markExchangeStarted()
          await exchangeGate
          return HttpResponse.json<ApiResponse<unknown>>({
            code: 0,
            message: 'success',
            data: {
              token: generateMockToken(admin.id),
              expiresAt: Date.now() + 60_000,
              user: admin,
              authorization: getTestAuthorization(admin),
              tenantId: 'tenant-demo',
              redirectPath: '/dashboard',
            },
          })
        }),
      )
      const store = useAuthStore()

      const pendingExchange = store.exchangeSsoTicket('mock-sso-ticket-delayed')
      await exchangeStarted
      await loginWithCaptcha(store, 'editor@example.com', 'editor123')
      releaseExchange()

      // AI modified: the latest explicit authentication action owns the browser principal.
      await expect(pendingExchange).resolves.toBeNull()
      expect(store.user).toMatchObject({ id: 2, role: 'editor' })
      expect(store.provider).toBe('password')
      expect(store.tenantId).toBeNull()
    })

    it('binds an unsafe requested destination to the dashboard at the backend boundary', async () => {
      const store = useAuthStore()
      const ticket = await requestMockSsoTicket('//evil.example')

      await expect(store.exchangeSsoTicket(ticket)).resolves.toBe('/dashboard')
    })

    it('rejects a malformed exchange success before writing credentials', async () => {
      server.use(
        http.post('/api/auth/sso/exchange', () =>
          HttpResponse.json<ApiResponse<unknown>>({
            code: 0,
            message: 'success',
            data: {
              token: 42,
              redirectPath: '//evil.example',
              user: { id: 1, role: 'admin' },
            },
          })),
      )
      const store = useAuthStore()

      await expect(store.exchangeSsoTicket('mock-sso-ticket-malformed')).rejects.toMatchObject({
        code: 'INVALID_API_RESPONSE_DATA',
        category: 'contract',
      })
      expect(store.isAuthenticated).toBe(false)
      expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull()
    })
  })

  describe('restoreSession()', () => {
    it('使用已保存的有效 token 恢复用户和权限状态', async () => {
      const signedInStore = useAuthStore()
      await loginWithCaptcha(signedInStore, 'editor@example.com', 'editor123')

      setActivePinia(createPinia())
      const restoredStore = useAuthStore()
      await restoredStore.restoreSession()

      expect(restoredStore.isSessionReady).toBe(true)
      expect(restoredStore.isAuthenticated).toBe(true)
      expect(restoredStore.user).toMatchObject({
        email: 'editor@example.com',
        role: 'editor',
      })
    })

    it('使用后端主体纠正浏览器中陈旧的租户归属', async () => {
      const authoritativeToken = generateMockToken(1, 60 * 60, 'tenant-demo')
      sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authoritativeToken)
      sessionStorage.setItem(AUTH_TENANT_STORAGE_KEY, 'stale-browser-tenant')
      setActivePinia(createPinia())
      const store = useAuthStore()

      await store.restoreSession()

      // AI modified: `/auth/me` owns tenant recovery before protected projections are restored.
      expect(store.tenantId).toBe('tenant-demo')
      expect(store.principalId).toBe('tenant-demo:1')
      expect(sessionStorage.getItem(AUTH_TENANT_STORAGE_KEY)).toBe('tenant-demo')
    })

    it('遇到无效 token 时清理本地会话', async () => {
      sessionStorage.setItem('auth_token', 'invalid-token')
      setActivePinia(createPinia())
      const store = useAuthStore()

      await store.restoreSession()

      expect(store.isSessionReady).toBe(true)
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(sessionStorage.getItem('auth_token')).toBeNull()
    })

    it('不会把旧版 localStorage 凭据恢复为会话', async () => {
      localStorage.setItem('auth_token', generateMockToken(1))
      localStorage.setItem('auth_refresh_token', 'persistent-refresh-token')
      localStorage.setItem('auth_provider', 'sso')
      localStorage.setItem('auth_tenant_id', 'legacy-tenant')
      setActivePinia(createPinia())
      const store = useAuthStore()

      await store.restoreSession()

      expect(store.isAuthenticated).toBe(false)
      expect(store.token).toBeNull()
      expect(store.provider).toBe('password')
      expect(store.tenantId).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('auth_refresh_token')).toBeNull()
    })

    it('遇到过期 token 时清理本地会话', async () => {
      sessionStorage.setItem('auth_token', generateMockToken(1, -1))
      setActivePinia(createPinia())
      const store = useAuthStore()

      await store.restoreSession()

      expect(store.isAuthenticated).toBe(false)
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(sessionStorage.getItem('auth_token')).toBeNull()
    })

    it('账号在会话期间被停用时结束本地会话', async () => {
      sessionStorage.setItem('auth_token', generateMockToken(6))
      setActivePinia(createPinia())
      const store = useAuthStore()

      await store.restoreSession()

      // AI modified: account suspension is terminal session state, not a recoverable permission denial.
      expect(store.isSessionReady).toBe(true)
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(sessionStorage.getItem('auth_token')).toBeNull()
    })

    it('遇到服务器故障时保留 token 并允许稍后重试', async () => {
      const savedToken = generateMockToken(1)
      sessionStorage.setItem('auth_token', savedToken)
      server.use(
        http.get('/api/auth/me', () =>
          HttpResponse.json<ApiResponse<null>>(
            { code: 500, message: '临时服务故障', data: null },
            { status: 500 },
          )),
      )
      setActivePinia(createPinia())
      const store = useAuthStore()

      await expect(store.restoreSession()).rejects.toThrow('临时服务故障')

      expect(store.isSessionReady).toBe(false)
      expect(store.token).toBe(savedToken)
      expect(sessionStorage.getItem('auth_token')).toBe(savedToken)
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('忽略旧会话迟到的恢复响应', async () => {
      const adminToken = generateMockToken(1)
      const { password: _password, ...admin } = mockUsers[0]!
      let markRestoreStarted = (): void => undefined
      let releaseRestore = (): void => undefined
      const restoreStarted = new Promise<void>(resolve => (markRestoreStarted = resolve))
      const restoreGate = new Promise<void>(resolve => (releaseRestore = resolve))
      server.use(
        http.get('/api/auth/me', async () => {
          markRestoreStarted()
          await restoreGate
          return HttpResponse.json<ApiResponse<unknown>>({
            code: 0,
            message: 'success',
            data: { tenantId: null, user: admin, authorization: getTestAuthorization(admin) },
          })
        }),
      )
      sessionStorage.setItem('auth_token', adminToken)
      setActivePinia(createPinia())
      const store = useAuthStore()

      const pendingRestore = store.restoreSession()
      await restoreStarted
      await loginWithCaptcha(store, 'editor@example.com', 'editor123')
      releaseRestore()
      await pendingRestore

      // AI modified: the replacement login remains authoritative after the older /me request resolves.
      expect(store.user).toMatchObject({ id: 2, role: 'editor' })
      expect(store.token).not.toBe(adminToken)
    })
  })

  describe('refreshPrincipal()', () => {
    it('ignores an older policy refresh that resolves after the newest snapshot', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')
      const { password: _password, ...administrator } = mockUsers[0]!
      const authorization = getTestAuthorization(administrator)
      let requestCount = 0
      let markFirstStarted = (): void => undefined
      let markSecondStarted = (): void => undefined
      let releaseFirst = (): void => undefined
      let releaseSecond = (): void => undefined
      const firstStarted = new Promise<void>(resolve => (markFirstStarted = resolve))
      const secondStarted = new Promise<void>(resolve => (markSecondStarted = resolve))
      const firstGate = new Promise<void>(resolve => (releaseFirst = resolve))
      const secondGate = new Promise<void>(resolve => (releaseSecond = resolve))
      server.use(
        http.get('/api/auth/me', async () => {
          requestCount += 1
          const isFirstRequest = requestCount === 1
          if (isFirstRequest) {
            markFirstStarted()
            await firstGate
          }
          else {
            markSecondStarted()
            await secondGate
          }
          return HttpResponse.json<ApiResponse<unknown>>({
            code: 0,
            message: 'success',
            data: {
              tenantId: null,
              user: administrator,
              authorization: {
                ...authorization,
                policyVersion: isFirstRequest ? 'policy-older' : 'policy-newest',
              },
            },
          })
        }),
      )

      const olderRefresh = store.refreshPrincipal()
      await firstStarted
      const newestRefresh = store.refreshPrincipal()
      await secondStarted
      releaseSecond()
      await expect(newestRefresh).resolves.toBe(true)
      releaseFirst()

      // AI modified: out-of-order `/auth/me` responses cannot roll CASL back to a stale policy.
      await expect(olderRefresh).resolves.toBe(false)
      expect(store.authorization?.policyVersion).toBe('policy-newest')
    })
  })

  describe('account profile', () => {
    it('修改密码后可以使用新密码登录', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')

      await expect(store.changePassword('admin123', 'weak')).rejects.toMatchObject({
        code: 'WEAK_PASSWORD',
      })
      await store.changePassword('admin123', 'newAdmin123')
      await store.logout()
      await loginWithCaptcha(store, 'admin@example.com', 'newAdmin123')

      expect(store.isAuthenticated).toBe(true)
    })

    it('更新个人资料后同步当前用户', async () => {
      const store = useAuthStore()
      await loginWithCaptcha(store, 'admin@example.com', 'admin123')

      const user = await store.updateProfile({
        name: '平台管理员',
        email: 'platform.admin@example.com',
      })

      expect(user).toMatchObject({
        name: '平台管理员',
        email: 'platform.admin@example.com',
      })
      expect(store.user).toMatchObject(user)
    })
  })

  describe('sensitive response cache policy', () => {
    it('marks password login and the current principal as no-store', async () => {
      const store = useAuthStore()
      const captcha = await store.getCaptcha()
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123',
          captchaId: captcha.captchaId,
          captchaCode: solveCaptchaChallenge(captcha.challenge),
        }),
      })
      const principalResponse = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${generateMockToken(1)}` },
      })

      // AI modified: session credentials and authorization snapshots cannot enter browser caches.
      expect(loginResponse.status).toBe(200)
      expect(principalResponse.status).toBe(200)
      expect(loginResponse.headers.get('Cache-Control')).toBe('no-store')
      expect(principalResponse.headers.get('Cache-Control')).toBe('no-store')
    })

    it('marks the one-time SSO exchange response as no-store', async () => {
      const ticket = await requestMockSsoTicket()
      const response = await fetch('/api/auth/sso/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      })

      // AI modified: an SSO-issued session receives the same cache protection as password login.
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    })
  })
})
