import type {
  AuthenticatedPrincipal,
  AuthorizationSnapshot,
  CaptchaChallenge,
  ChangePasswordInput,
  LoginInput,
  LoginResponse,
  SsoConfiguration,
  SsoExchangeInput,
  SsoExchangeResponse,
  SsoStartInput,
  SsoStartResponse,
  UpdateProfileInput,
} from '@/types/auth'
import { z } from 'zod'
import { DATA_SCOPE_GRANT_SCHEMA } from '@/features/roles/role-api-contracts'
import { PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from '@/features/roles/types'
import { ADMIN_USER_SCHEMA } from '@/features/users/user-api-contracts'
import { AUTH_PROVIDERS } from '@/types/auth'

const PERMISSION_IDENTIFIER_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*){2,}$/)

export const AUTHORIZATION_SNAPSHOT_SCHEMA: z.ZodType<AuthorizationSnapshot> = z
  .object({
    contractVersion: z.literal(1),
    policyVersion: z.string().trim().min(1).max(200),
    grants: z
      .array(
        z
          .object({
            action: z.enum(PERMISSION_ACTIONS),
            subject: z.enum(PERMISSION_SUBJECTS),
            permissionIdentifier: PERMISSION_IDENTIFIER_SCHEMA,
          })
          .strict(),
      )
      .max(200),
    dataScope: DATA_SCOPE_GRANT_SCHEMA,
  })
  .strict()

// AI modified: identity and authorization are validated atomically so CASL never derives policy from a display role.
export const AUTHENTICATED_PRINCIPAL_SCHEMA: z.ZodType<AuthenticatedPrincipal> = z
  .object({
    tenantId: z.string().trim().min(1).max(200).nullable(),
    user: ADMIN_USER_SCHEMA,
    authorization: AUTHORIZATION_SNAPSHOT_SCHEMA,
  })
  .strict()

// AI modified: authentication payloads are validated before credentials or principals reach the store.
export const LOGIN_RESPONSE_SCHEMA: z.ZodType<LoginResponse> = z
  .object({
    token: z.string().trim().min(1).max(4096),
    expiresAt: z.number().int().positive().optional(),
    tenantId: z.string().trim().min(1).max(200).nullable(),
    user: ADMIN_USER_SCHEMA,
    authorization: AUTHORIZATION_SNAPSHOT_SCHEMA,
  })
  .strict()

export const CAPTCHA_CHALLENGE_SCHEMA: z.ZodType<CaptchaChallenge> = z
  .object({
    captchaId: z.string().trim().min(1).max(200),
    challenge: z.string().trim().min(1).max(200),
    expiresAt: z.number().int().positive(),
  })
  .strict()

export const LOGIN_INPUT_SCHEMA: z.ZodType<LoginInput> = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(1024),
    captchaId: z.string().trim().min(1).max(200).optional(),
    captchaCode: z.string().trim().min(1).max(200).optional(),
    provider: z.literal(AUTH_PROVIDERS[0]).optional(),
    tenantId: z.string().trim().min(1).max(200).optional(),
  })
  .strict()

export const SSO_CONFIGURATION_SCHEMA: z.ZodType<SsoConfiguration> = z
  .object({
    isEnabled: z.boolean(),
    providerName: z.string().trim().min(1).max(80),
  })
  .strict()

export const SSO_START_INPUT_SCHEMA: z.ZodType<SsoStartInput> = z
  .object({
    returnTo: z.string().trim().min(1).max(2048),
  })
  .strict()

export const SSO_START_RESPONSE_SCHEMA: z.ZodType<SsoStartResponse> = z
  .object({
    authorizationUrl: z.string().trim().min(1).max(4096),
    expiresAt: z.number().int().positive(),
  })
  .strict()

export const SSO_EXCHANGE_INPUT_SCHEMA: z.ZodType<SsoExchangeInput> = z
  .object({
    ticket: z.string().trim().min(1).max(2048),
  })
  .strict()

export const SSO_EXCHANGE_RESPONSE_SCHEMA: z.ZodType<SsoExchangeResponse> = z
  .object({
    token: z.string().trim().min(1).max(4096),
    expiresAt: z.number().int().positive().optional(),
    tenantId: z.string().trim().min(1).max(200).nullable(),
    user: ADMIN_USER_SCHEMA,
    authorization: AUTHORIZATION_SNAPSHOT_SCHEMA,
    redirectPath: z.string().trim().min(1).max(2048),
  })
  .strict()

export const FORGOT_PASSWORD_INPUT_SCHEMA = z
  .object({ email: z.string().trim().email().max(254) })
  .strict()

export const RESET_PASSWORD_INPUT_SCHEMA = z
  .object({
    token: z.string().trim().min(1).max(4096),
    newPassword: z.string().min(1).max(1024),
  })
  .strict()

export const CHANGE_PASSWORD_INPUT_SCHEMA: z.ZodType<ChangePasswordInput> = z
  .object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: z.string().min(1).max(1024),
  })
  .strict()

export const UPDATE_PROFILE_INPUT_SCHEMA: z.ZodType<UpdateProfileInput> = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
  })
  .strict()
