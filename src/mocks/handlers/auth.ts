import { http, HttpResponse } from 'msw'
import type { User } from '@/stores/auth'
import type { ApiResponse } from '@/lib/http'
import {
  mockUsers,
  findUserByEmail,
  generateMockToken,
  parseUserIdFromToken,
} from '@/mocks/data/users'

// ── POST /api/auth/login ──────────────────────────────────────────────────────

interface LoginRequestBody {
  email: string
  password: string
}

interface LoginResponseData {
  token: string
  user: User
}

export const loginHandler = http.post<never, LoginRequestBody>(
  '/api/auth/login',
  async ({ request }) => {
    const { email, password } = await request.json()

    // 先判断账号是否存在，再判断密码是否正确，给出不同错误码
    const userExists = mockUsers.find((u) => u.email === email)

    if (!userExists) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'USER_NOT_FOUND', message: '该邮箱未注册，请检查后重试', data: null },
        { status: 401 },
      )
    }

    const found = mockUsers.find((u) => u.email === email && u.password === password)

    if (!found) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'WRONG_PASSWORD', message: '密码错误，请重试', data: null },
        { status: 401 },
      )
    }

    const { password: _password, ...user } = found
    const token = generateMockToken(user.id)

    return HttpResponse.json<ApiResponse<LoginResponseData>>({
      code: 0,
      message: 'success',
      data: { token, user },
    })
  },
)

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

export const logoutHandler = http.post('/api/auth/logout', () => {
  return HttpResponse.json<ApiResponse<null>>({
    code: 0,
    message: 'ok',
    data: null,
  })
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

export const meHandler = http.get<never, never, ApiResponse<User | null>>(
  '/api/auth/me',
  ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 401, message: '未授权，请先登录', data: null },
        { status: 401 },
      )
    }

    const userId = parseUserIdFromToken(token)
    if (!userId) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 401, message: 'Token 无效或已过期', data: null },
        { status: 401 },
      )
    }

    const user = findUserByEmail(mockUsers.find((u) => u.id === userId)?.email ?? '')
    if (!user) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 404, message: '用户不存在', data: null },
        { status: 404 },
      )
    }

    return HttpResponse.json<ApiResponse<User>>({
      code: 0,
      message: 'success',
      data: user,
    })
  },
)

// ── 内存存储：email → { token, expiry } ──────────────────────────────────────
const resetTokenStore = new Map<string, { token: string; expiry: number }>()

/** 生成随机重置 token */
function generateResetToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

interface ForgotPasswordRequestBody {
  email: string
}

export const forgotPasswordHandler = http.post<never, ForgotPasswordRequestBody>(
  '/api/auth/forgot-password',
  async ({ request }) => {
    const { email } = await request.json()

    const userExists = mockUsers.find((u) => u.email === email)
    if (!userExists) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'USER_NOT_FOUND', message: '该邮箱未注册，请检查后重试', data: null },
        { status: 400 },
      )
    }

    const token = generateResetToken()
    // 有效期 30 分钟
    resetTokenStore.set(email, { token, expiry: Date.now() + 30 * 60 * 1000 })

    return HttpResponse.json<ApiResponse<null>>({
      code: 0,
      message: 'ok',
      data: null,
    })
  },
)

// ── POST /api/auth/reset-password ────────────────────────────────────────────

interface ResetPasswordRequestBody {
  token: string
  newPassword: string
}

export const resetPasswordHandler = http.post<never, ResetPasswordRequestBody>(
  '/api/auth/reset-password',
  async ({ request }) => {
    const { token, newPassword } = await request.json()

    // 从内存 store 中查找匹配的 token
    let matchedEmail: string | null = null
    for (const [email, record] of resetTokenStore.entries()) {
      if (record.token === token) {
        if (Date.now() > record.expiry) {
          resetTokenStore.delete(email)
          return HttpResponse.json<ApiResponse<null>>(
            { code: 'INVALID_TOKEN', message: '重置链接已过期，请重新申请', data: null },
            { status: 400 },
          )
        }
        matchedEmail = email
        break
      }
    }

    if (!matchedEmail) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'INVALID_TOKEN', message: '重置链接无效，请重新申请', data: null },
        { status: 400 },
      )
    }

    // 更新 mockUsers 中的密码
    const user = mockUsers.find((u) => u.email === matchedEmail)
    if (user) {
      user.password = newPassword
    }

    resetTokenStore.delete(matchedEmail)

    return HttpResponse.json<ApiResponse<null>>({
      code: 0,
      message: 'ok',
      data: null,
    })
  },
)

export const authHandlers = [
  loginHandler,
  logoutHandler,
  meHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
]
