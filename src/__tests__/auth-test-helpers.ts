import type { useAuthStore, User } from '@/stores/auth'
import type { AuthenticatedPrincipal, AuthorizationSnapshot, LoginOptions } from '@/types/auth'
import { getRoleAuthorizationSnapshot } from '@/features/roles/role-policy'

type AuthStore = ReturnType<typeof useAuthStore>

export function getTestAuthorization(user: Pick<User, 'role'>): AuthorizationSnapshot {
  return getRoleAuthorizationSnapshot(user.role)
}

export function getTestPrincipal(user: User): AuthenticatedPrincipal {
  // AI modified: direct store tests must supply the same atomic principal shape as production authentication.
  return { tenantId: null, user, authorization: getTestAuthorization(user) }
}

export function solveCaptchaChallenge(challenge: string): string {
  const operands = challenge.match(/\d+/g)?.map(Number)
  if (!operands?.[0] || !operands[1])
    throw new Error(`Unsupported captcha challenge: ${challenge}`)
  return String(operands[0] + operands[1])
}

export async function loginWithCaptcha(
  authStore: AuthStore,
  email: string,
  password: string,
  boundary: Pick<LoginOptions, 'provider' | 'tenantId'> = {},
): Promise<boolean> {
  const captcha = await authStore.getCaptcha()
  // AI modified: tests exercise the same mandatory backend challenge as the browser login form.
  return authStore.login(email, password, {
    ...boundary,
    captchaId: captcha.captchaId,
    captchaCode: solveCaptchaChallenge(captcha.challenge),
    provider: boundary.provider ?? 'password',
  })
}
