import type { User } from '@/stores/auth'

export interface MockUser extends User {
  password: string
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    name: '超级管理员',
    email: 'admin@example.com',
    password: 'admin123',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=admin',
    role: 'admin',
  },
  {
    id: 2,
    name: '内容编辑',
    email: 'editor@example.com',
    password: 'editor123',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=editor',
    role: 'editor',
  },
  {
    id: 3,
    name: '只读访客',
    email: 'viewer@example.com',
    password: 'viewer123',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=viewer',
    role: 'viewer',
  },
]

/** 根据 email 查找用户（不含 password） */
export function findUserByEmail(email: string): User | undefined {
  const found = mockUsers.find((u) => u.email === email)
  if (!found) return undefined
  const { password: _password, ...user } = found
  return user
}

/** 生成伪 JWT token（格式：mock.base64(header).base64(payload).signature） */
export function generateMockToken(userId: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      sub: String(userId),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    }),
  )
  return `${header}.${payload}.mock-signature`
}

/** 从伪 JWT 中解析 userId */
export function parseUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]!))
    return Number(payload.sub) || null
  } catch {
    return null
  }
}
