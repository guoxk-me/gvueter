export interface LoginCredentials {
  email: string
  password: string
  captchaCode: string
}

export type LoginField = keyof LoginCredentials

export interface LoginFormFailure {
  id: number
  field?: LoginField
  message: string
}

export interface ProfileInput {
  name: string
  email: string
}

export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const PASSWORD_MIN_LENGTH = 8
