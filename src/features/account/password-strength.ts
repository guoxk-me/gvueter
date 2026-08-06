import { PASSWORD_MIN_LENGTH } from '@/features/account/types'

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  isStrong: boolean
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const checks = [
    password.length >= PASSWORD_MIN_LENGTH,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
  ]
  const score = checks.filter(Boolean).length as PasswordStrengthResult['score']
  return { score, isStrong: score === 4 }
}

export function isStrongPassword(password: string): boolean {
  return getPasswordStrength(password).isStrong
}
