import type { components } from '@/types/openapi-generated'

export const AUTH_PROVIDERS = ['password', 'sso'] as const

export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

export interface AuthBoundary {
  provider?: AuthProvider
  tenantId?: string
}

// AI modified: authentication transport DTOs follow the generated OpenAPI source of truth.
export type AuthTokenSet = Pick<components['schemas']['LoginResponse'], 'expiresAt' | 'token'>
export type AuthorizationGrant = components['schemas']['AuthorizationGrant']
export type AuthorizationSnapshot = components['schemas']['AuthorizationSnapshot']
export type AuthenticatedPrincipal = components['schemas']['AuthenticatedPrincipal']
export type LoginInput = components['schemas']['LoginInput']
export type LoginOptions = Omit<LoginInput, 'email' | 'password'>
export type LoginResponse = components['schemas']['LoginResponse']
export type ForgotPasswordInput = components['schemas']['ForgotPasswordInput']
export type ResetPasswordInput = components['schemas']['ResetPasswordInput']
export type SsoConfiguration = components['schemas']['SsoConfiguration']
export type SsoStartInput = components['schemas']['SsoStartInput']
export type SsoStartResponse = components['schemas']['SsoStartResponse']
export type SsoExchangeInput = components['schemas']['SsoExchangeInput']
export type SsoExchangeResponse = components['schemas']['SsoExchangeResponse']
export type CaptchaChallenge = components['schemas']['CaptchaChallenge']
export type ChangePasswordInput = components['schemas']['ChangePasswordInput']
export type UpdateProfileInput = components['schemas']['UpdateProfileInput']
