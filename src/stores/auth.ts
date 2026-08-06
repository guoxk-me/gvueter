import type { AdminUser } from '@/features/users/types'
import type {
  AuthenticatedPrincipal,
  AuthorizationSnapshot,
  AuthProvider,
  AuthTokenSet,
  CaptchaChallenge,
  LoginOptions,
  LoginResponse,
  SsoConfiguration,
  SsoExchangeResponse,
  SsoStartResponse,
  UpdateProfileInput,
} from '@/types/auth'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  AUTHENTICATED_PRINCIPAL_SCHEMA,
  CAPTCHA_CHALLENGE_SCHEMA,
  LOGIN_RESPONSE_SCHEMA,
  SSO_CONFIGURATION_SCHEMA,
  SSO_EXCHANGE_RESPONSE_SCHEMA,
  SSO_START_RESPONSE_SCHEMA,
} from '@/features/account/auth-api-contracts'
import { ADMIN_USER_SCHEMA } from '@/features/users/user-api-contracts'
import { updateAbility } from '@/lib/ability'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { ACCESS_TOKEN_SESSION_STORAGE_KEY } from '@/lib/auth-session'
import {
  getBrowserStorage,
  safeStorageDiscard,
  safeStorageGet,
  safeStorageSet,
} from '@/lib/browser-storage'
import { ApiError, get, isCanceledRequest, isSessionInvalidatingError, post, put } from '@/lib/http'
import { registerSessionInvalidationHandler, resetSessionInvalidation } from '@/lib/request-policy'
import { notifySessionPrincipalChanged } from '@/lib/session-boundary'

export type User = AdminUser
export type { CaptchaChallenge } from '@/types/auth'

export const AUTH_TOKEN_STORAGE_KEY = ACCESS_TOKEN_SESSION_STORAGE_KEY
export const AUTH_TOKEN_EXPIRY_STORAGE_KEY = 'auth_token_expires_at'
export const AUTH_PROVIDER_STORAGE_KEY = 'auth_provider'
export const AUTH_TENANT_STORAGE_KEY = 'auth_tenant_id'

const LEGACY_REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token'
const LEGACY_AUTH_STORAGE_KEYS = [
  AUTH_TOKEN_STORAGE_KEY,
  LEGACY_REFRESH_TOKEN_STORAGE_KEY,
  AUTH_TOKEN_EXPIRY_STORAGE_KEY,
  AUTH_PROVIDER_STORAGE_KEY,
  AUTH_TENANT_STORAGE_KEY,
] as const

function discardLegacyPersistentCredentials(): void {
  const persistentStorage = getBrowserStorage('local')
  // AI modified: persistent browser storage is never accepted as an authentication source.
  for (const storageKey of LEGACY_AUTH_STORAGE_KEYS)
    safeStorageDiscard(persistentStorage, storageKey)
}

function getStoredExpiry(storage: Storage | undefined): number | null {
  const value = Number(safeStorageGet(storage, AUTH_TOKEN_EXPIRY_STORAGE_KEY))
  return Number.isFinite(value) && value > 0 ? value : null
}

function getStoredProvider(storage: Storage | undefined): AuthProvider {
  return safeStorageGet(storage, AUTH_PROVIDER_STORAGE_KEY) === 'sso' ? 'sso' : 'password'
}

function clearStoredSession(storage: Storage | undefined): void {
  safeStorageDiscard(storage, AUTH_TOKEN_STORAGE_KEY)
  safeStorageDiscard(storage, AUTH_TOKEN_EXPIRY_STORAGE_KEY)
  safeStorageDiscard(storage, AUTH_PROVIDER_STORAGE_KEY)
  safeStorageDiscard(storage, AUTH_TENANT_STORAGE_KEY)
}

function persistStoredSession(
  storage: Storage | undefined,
  tokens: AuthTokenSet,
  nextProvider: AuthProvider,
  nextTenantId: string | null,
): boolean {
  const didStoreToken = safeStorageSet(storage, AUTH_TOKEN_STORAGE_KEY, tokens.token)
  const didStoreExpiry = tokens.expiresAt
    ? safeStorageSet(storage, AUTH_TOKEN_EXPIRY_STORAGE_KEY, String(tokens.expiresAt))
    : safeStorageDiscard(storage, AUTH_TOKEN_EXPIRY_STORAGE_KEY)
  const didStoreProvider = safeStorageSet(storage, AUTH_PROVIDER_STORAGE_KEY, nextProvider)
  const didStoreTenant = nextTenantId
    ? safeStorageSet(storage, AUTH_TENANT_STORAGE_KEY, nextTenantId)
    : safeStorageDiscard(storage, AUTH_TENANT_STORAGE_KEY)

  if (didStoreToken && didStoreExpiry && didStoreProvider && didStoreTenant) return true

  // AI modified: a partially persisted credential set is removed before memory can accept it.
  clearStoredSession(storage)
  return false
}

export function getSessionPrincipalId(
  account: User | null,
  activeTenantId: string | null,
): string | null {
  if (!account) return null
  return activeTenantId ? `${activeTenantId}:${account.id}` : String(account.id)
}

export const useAuthStore = defineStore('auth', () => {
  discardLegacyPersistentCredentials()
  const browserSessionStorage = getBrowserStorage('session')
  const token = ref<string | null>(
    safeStorageGet(browserSessionStorage, AUTH_TOKEN_STORAGE_KEY) || null,
  )
  const tokenExpiresAt = ref<number | null>(getStoredExpiry(browserSessionStorage))
  const provider = ref<AuthProvider>(getStoredProvider(browserSessionStorage))
  const tenantId = ref<string | null>(
    safeStorageGet(browserSessionStorage, AUTH_TENANT_STORAGE_KEY) || null,
  )
  const user = ref<User | null>(null)
  const authorization = ref<AuthorizationSnapshot | null>(null)
  const isSessionReady = ref(false)
  let sessionRestoreTask: Promise<void> | null = null
  let sessionRevision = 0
  let ssoExchangeTask: { ticket: string; task: Promise<string | null> } | null = null

  const isAuthenticated = computed(() => Boolean(token.value && user.value && authorization.value))
  const principalId = computed(() => getSessionPrincipalId(user.value, tenantId.value))

  // AI modified: identity and its backend-issued policy update CASL as one reactive boundary.
  watch(
    [user, authorization],
    ([newUser, nextAuthorization]) => updateAbility(newUser, nextAuthorization),
    { immediate: true },
  )

  function applySessionTokens(tokens: AuthTokenSet): void {
    token.value = tokens.token
    tokenExpiresAt.value = tokens.expiresAt ?? null
    resetSessionInvalidation()
  }

  function setToken(newToken: string): void {
    sessionRevision += 1
    const nextTokens: AuthTokenSet = {
      token: newToken,
      expiresAt: tokenExpiresAt.value ?? undefined,
    }
    if (!persistStoredSession(browserSessionStorage, nextTokens, provider.value, tenantId.value)) {
      clearSession()
      return
    }
    applySessionTokens(nextTokens)
  }

  function applyUser(newUser: User, previousPrincipalId: string | null) {
    const nextPrincipalId = getSessionPrincipalId(newUser, tenantId.value)
    const hasAuthorizationChanged = Boolean(user.value && user.value.role !== newUser.role)
    if (previousPrincipalId !== nextPrincipalId || hasAuthorizationChanged) {
      // AI modified: a role claim change invalidates privileged projections even for the same account.
      notifySessionPrincipalChanged({
        previousPrincipalId,
        principalId: nextPrincipalId,
        reason: 'principal-changed',
      })
    }
    user.value = newUser
  }

  function applyAuthenticatedPrincipal(
    principal: AuthenticatedPrincipal,
    previousPrincipalId: string | null,
  ): void {
    const nextPrincipalId = getSessionPrincipalId(principal.user, principal.tenantId)
    const hasAuthorizationChanged = Boolean(
      authorization.value &&
      (authorization.value.contractVersion !== principal.authorization.contractVersion ||
        authorization.value.policyVersion !== principal.authorization.policyVersion),
    )
    const hasRoleChanged = Boolean(user.value && user.value.role !== principal.user.role)
    if (previousPrincipalId !== nextPrincipalId || hasAuthorizationChanged || hasRoleChanged) {
      // AI modified: backend policy-version changes invalidate every privileged client projection.
      notifySessionPrincipalChanged({
        previousPrincipalId,
        principalId: nextPrincipalId,
        reason: 'principal-changed',
      })
    }
    // AI modified: tenant ownership is accepted only from the authenticated backend principal.
    tenantId.value = principal.tenantId
    if (token.value) {
      if (principal.tenantId)
        safeStorageSet(browserSessionStorage, AUTH_TENANT_STORAGE_KEY, principal.tenantId)
      else safeStorageDiscard(browserSessionStorage, AUTH_TENANT_STORAGE_KEY)
    }
    user.value = principal.user
    authorization.value = principal.authorization
  }

  function setUser(newUser: User): void {
    sessionRevision += 1
    applyUser(newUser, getSessionPrincipalId(user.value, tenantId.value))
  }

  function setAuthenticatedPrincipal(principal: AuthenticatedPrincipal): void {
    sessionRevision += 1
    applyAuthenticatedPrincipal(principal, getSessionPrincipalId(user.value, tenantId.value))
  }

  function clearSession(): boolean {
    // AI modified: advancing the revision makes every in-flight operation from this session stale.
    sessionRevision += 1
    const previousPrincipalId = getSessionPrincipalId(user.value, tenantId.value)
    const hasSessionState = Boolean(
      user.value ||
      authorization.value ||
      token.value ||
      tokenExpiresAt.value ||
      tenantId.value ||
      provider.value !== 'password',
    )
    token.value = null
    tokenExpiresAt.value = null
    provider.value = 'password'
    tenantId.value = null
    user.value = null
    authorization.value = null
    clearStoredSession(browserSessionStorage)
    discardLegacyPersistentCredentials()
    if (hasSessionState) {
      // AI modified: every session end clears principal-scoped state through the shared boundary.
      notifySessionPrincipalChanged({
        previousPrincipalId,
        principalId: null,
        reason: 'session-ended',
      })
    }
    return hasSessionState
  }

  function establishAuthenticatedSession(
    data: LoginResponse,
    nextProvider: AuthProvider,
    authenticationRevision: number,
  ): boolean {
    if (sessionRevision !== authenticationRevision) return false

    const previousPrincipalId = getSessionPrincipalId(user.value, tenantId.value)
    if (!persistStoredSession(browserSessionStorage, data, nextProvider, data.tenantId)) {
      clearSession()
      isSessionReady.value = true
      return false
    }
    applySessionTokens(data)
    provider.value = nextProvider
    // AI modified: password and SSO establish identity through one atomic session boundary.
    applyAuthenticatedPrincipal(data, previousPrincipalId)
    isSessionReady.value = true
    return true
  }

  registerSessionInvalidationHandler('auth-store', () => {
    // AI modified: Axios reports session expiry through a callback instead of importing this store.
    clearSession()
    isSessionReady.value = true
  })

  async function restoreSession(): Promise<void> {
    if (isSessionReady.value) {
      return
    }

    if (!token.value) {
      const didNotifyBoundary = clearSession()
      if (!didNotifyBoundary)
        notifySessionPrincipalChanged({
          previousPrincipalId: null,
          principalId: null,
          reason: 'session-ended',
        })
      isSessionReady.value = true
      return
    }

    if (!sessionRestoreTask) {
      const restoreRevision = sessionRevision
      const restoreToken = token.value
      // AI modified: restore the user before route permissions are evaluated after a refresh.
      sessionRestoreTask = get<AuthenticatedPrincipal>('/auth/me', undefined, {
        responseSchema: AUTHENTICATED_PRINCIPAL_SCHEMA,
      })
        .then((currentPrincipal) => {
          if (sessionRevision !== restoreRevision || token.value !== restoreToken) return
          applyAuthenticatedPrincipal(
            currentPrincipal,
            getSessionPrincipalId(user.value, tenantId.value),
          )
          isSessionReady.value = true
        })
        .catch((error: unknown) => {
          // AI modified: a response belonging to a replaced session cannot overwrite its successor.
          if (sessionRevision !== restoreRevision || token.value !== restoreToken) return
          // AI modified: transient network/server failures must not destroy a valid local session.
          if (isSessionInvalidatingError(error)) {
            clearSession()
            isSessionReady.value = true
            return
          }
          throw error
        })
        .finally(() => {
          sessionRestoreTask = null
        })
    }

    await sessionRestoreTask
  }

  async function refreshPrincipal(): Promise<boolean> {
    if (!token.value) return false
    // AI modified: only the newest policy refresh may replace the active authorization snapshot.
    const refreshRevision = ++sessionRevision
    const refreshToken = token.value
    let currentPrincipal: AuthenticatedPrincipal
    try {
      currentPrincipal = await get<AuthenticatedPrincipal>('/auth/me', undefined, {
        responseSchema: AUTHENTICATED_PRINCIPAL_SCHEMA,
      })
    } catch (error) {
      // AI modified: a newer refresh intentionally cancels its predecessor and owns the result.
      if (isCanceledRequest(error)) return false
      throw error
    }
    if (sessionRevision !== refreshRevision || token.value !== refreshToken) return false
    applyAuthenticatedPrincipal(currentPrincipal, getSessionPrincipalId(user.value, tenantId.value))
    return true
  }

  async function login(
    email: string,
    password: string,
    options: LoginOptions = {},
  ): Promise<boolean> {
    // AI modified: only the newest login attempt may establish browser session state.
    const loginRevision = ++sessionRevision
    const data = await post<LoginResponse>(
      '/auth/login',
      { email, password, ...options },
      { responseSchema: LOGIN_RESPONSE_SCHEMA },
    )
    // AI modified: the submitted tenant is only a backend hint; the response owns session tenancy.
    return establishAuthenticatedSession(data, 'password', loginRevision)
  }

  async function getCaptcha(): Promise<CaptchaChallenge> {
    return get<CaptchaChallenge>('/auth/captcha', undefined, {
      responseSchema: CAPTCHA_CHALLENGE_SCHEMA,
    })
  }

  async function getSsoConfiguration(): Promise<SsoConfiguration> {
    return get<SsoConfiguration>('/auth/sso/config', undefined, {
      responseSchema: SSO_CONFIGURATION_SCHEMA,
    })
  }

  async function startSsoLogin(returnTo: string): Promise<SsoStartResponse> {
    return post<SsoStartResponse>(
      '/auth/sso/start',
      { returnTo },
      { responseSchema: SSO_START_RESPONSE_SCHEMA },
    )
  }

  async function exchangeSsoTicket(ticket: string): Promise<string | null> {
    if (ssoExchangeTask?.ticket === ticket) return ssoExchangeTask.task
    if (token.value || user.value) {
      throw new ApiError(
        'SSO_SESSION_ACTIVE',
        'An active session must be signed out before starting another SSO session.',
        409,
      )
    }

    const exchangeRevision = ++sessionRevision
    const task = post<SsoExchangeResponse>(
      '/auth/sso/exchange',
      { ticket },
      { responseSchema: SSO_EXCHANGE_RESPONSE_SCHEMA },
    ).then((data) => {
      const didAuthenticate = establishAuthenticatedSession(data, 'sso', exchangeRevision)
      return didAuthenticate ? data.redirectPath : null
    })
    // AI modified: duplicate callback mounts share one request so a one-use ticket cannot race itself.
    ssoExchangeTask = { ticket, task }
    try {
      return await task
    } finally {
      if (ssoExchangeTask?.task === task) ssoExchangeTask = null
    }
  }

  async function forgotPassword(email: string): Promise<void> {
    await post<null>('/auth/forgot-password', { email }, { responseSchema: EMPTY_RESPONSE_SCHEMA })
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    await post<null>(
      '/auth/reset-password',
      { token, newPassword },
      { responseSchema: EMPTY_RESPONSE_SCHEMA },
    )
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await post<null>(
      '/auth/change-password',
      { currentPassword, newPassword },
      { responseSchema: EMPTY_RESPONSE_SCHEMA },
    )
  }

  async function updateProfile(input: UpdateProfileInput): Promise<User> {
    const profileRevision = sessionRevision
    const profileToken = token.value
    const updatedUser = await put<User>('/auth/profile', input, {
      responseSchema: ADMIN_USER_SCHEMA,
    })
    if (sessionRevision !== profileRevision || token.value !== profileToken) return updatedUser
    setUser(updatedUser)
    return updatedUser
  }

  async function logout(): Promise<void> {
    const logoutRevision = ++sessionRevision
    const logoutToken = token.value
    try {
      await post<null>('/auth/logout', undefined, { responseSchema: EMPTY_RESPONSE_SCHEMA })
    } catch (error: unknown) {
      // AI modified: an already-expired or server-revoked session is still a successful local logout.
      if (!isSessionInvalidatingError(error)) throw error
    } finally {
      // AI modified: a late logout response cannot erase a newer login established in the same tab.
      if (sessionRevision === logoutRevision && token.value === logoutToken) {
        clearSession()
        isSessionReady.value = true
      }
    }
  }

  return {
    token,
    tokenExpiresAt,
    provider,
    tenantId,
    user,
    authorization,
    principalId,
    isAuthenticated,
    isSessionReady,
    login,
    logout,
    restoreSession,
    refreshPrincipal,
    getCaptcha,
    getSsoConfiguration,
    startSsoLogin,
    exchangeSsoTicket,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
    setToken,
    setUser,
    setAuthenticatedPrincipal,
  }
})
