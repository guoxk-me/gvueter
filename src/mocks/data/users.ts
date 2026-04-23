import type { User } from '@/stores/auth'

export interface MockUser extends User {
  password: string
}

function createAvatarDataUri(label: string, background: string, foreground = '#ffffff'): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <rect width="96" height="96" rx="24" fill="${background}" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${foreground}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${label}</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    name: '超级管理员',
    email: 'admin@example.com',
    password: 'admin123',
    avatar: createAvatarDataUri('A', '#2563eb'),
    role: 'admin',
  },
  {
    id: 2,
    name: '内容编辑',
    email: 'editor@example.com',
    password: 'editor123',
    avatar: createAvatarDataUri('E', '#059669'),
    role: 'editor',
  },
  {
    id: 3,
    name: '只读访客',
    email: 'viewer@example.com',
    password: 'viewer123',
    avatar: createAvatarDataUri('V', '#7c3aed'),
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
