import type { DataScopeGrant, RolePermission } from '@/features/roles/types'
import type { AdminUser } from '@/features/users/types'

export const AUTH_PROVIDERS = ['password', 'sso'] as const

export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

export interface AuthBoundary {
  provider?: AuthProvider
  tenantId?: string
}

export interface AuthTokenSet {
  /** Access token kept as `token` for compatibility with the existing store contract. */
  token: string
  expiresAt?: number
}

export interface AuthorizationGrant extends RolePermission {
  /** Stable backend permission key used by API enforcement and audit records. */
  permissionIdentifier: string
}

export interface AuthorizationSnapshot {
  contractVersion: 1
  policyVersion: string
  grants: AuthorizationGrant[]
  dataScope: DataScopeGrant
}

export interface AuthenticatedPrincipal {
  /** Backend-selected tenant; null denotes an explicitly unscoped single-tenant session. */
  tenantId: string | null
  user: AdminUser
  authorization: AuthorizationSnapshot
}

export interface LoginOptions {
  captchaId?: string
  captchaCode?: string
  provider?: 'password'
  tenantId?: string
}

export interface LoginInput extends LoginOptions {
  email: string
  password: string
}

export interface LoginResponse extends AuthTokenSet, AuthenticatedPrincipal {}

export interface SsoConfiguration {
  isEnabled: boolean
  providerName: string
}

export interface SsoStartInput {
  returnTo: string
}

export interface SsoStartResponse {
  authorizationUrl: string
  expiresAt: number
}

export interface SsoExchangeInput {
  ticket: string
}

export interface SsoExchangeResponse extends LoginResponse {
  redirectPath: string
}

export interface CaptchaChallenge {
  captchaId: string
  challenge: string
  expiresAt: number
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileInput {
  name: string
  email: string
}
