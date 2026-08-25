import type { AdminUser } from '@/features/users/types'
import {
  getBrowserStorage,
  safeStorageDiscard,
  safeStorageGet,
  safeStorageSet,
} from '@/lib/browser-storage'

export interface MockUser extends AdminUser {
  password: string
}

interface MockTokenRecord {
  userId: number
  expiresAt: number
  tenantId: string | null
}

export type MockTokenSession
  = | { status: 'valid', userId: number, expiresAt: number, tenantId: string | null }
    | { status: 'expired', userId: number, expiresAt: number, tenantId: string | null }
    | { status: 'invalid' }

const MAX_MOCK_TOKEN_SESSIONS = 500
const MOCK_TOKEN_SESSION_STORAGE_KEY = '__gvueter_mock_token_sessions__'
const mockTokenSessions = new Map<string, MockTokenRecord>()
let hasRestoredMockTokenSessions = false

function getMockSessionStorage(): Storage | undefined {
  return getBrowserStorage('session')
}

function saveMockTokenSessions(): void {
  const storage = getMockSessionStorage()
  if (mockTokenSessions.size === 0) {
    safeStorageDiscard(storage, MOCK_TOKEN_SESSION_STORAGE_KEY)
    return
  }

  // AI modified: the Mock registry uses the same privacy/quota-safe storage boundary as the app.
  safeStorageSet(storage, MOCK_TOKEN_SESSION_STORAGE_KEY, JSON.stringify([...mockTokenSessions]))
}

function restoreMockTokenSessions(): void {
  if (hasRestoredMockTokenSessions)
    return
  hasRestoredMockTokenSessions = true
  const storage = getMockSessionStorage()
  if (!storage)
    return

  try {
    const storedSessions = safeStorageGet(storage, MOCK_TOKEN_SESSION_STORAGE_KEY)
    if (!storedSessions)
      return
    const sessionEntries: unknown = JSON.parse(storedSessions)
    if (!Array.isArray(sessionEntries))
      throw new Error('Invalid Mock session registry')
    for (const entry of sessionEntries) {
      if (!Array.isArray(entry) || entry.length !== 2)
        continue
      const [token, record] = entry
      if (
        typeof token !== 'string'
        || !token.startsWith('mock-session-')
        || typeof record !== 'object'
        || record === null
        || !('userId' in record)
        || !('expiresAt' in record)
        || typeof record.userId !== 'number'
        || !Number.isInteger(record.userId)
        || typeof record.expiresAt !== 'number'
        || !Number.isFinite(record.expiresAt)
      ) {
        continue
      }
      mockTokenSessions.set(token, {
        userId: Number(record.userId),
        expiresAt: record.expiresAt,
        // AI modified: older Mock sessions migrate to the explicit single-tenant boundary.
        tenantId:
          'tenantId' in record && typeof record.tenantId === 'string' ? record.tenantId : null,
      })
    }
  }
  catch {
    // AI modified: privacy/storage failures degrade the demo to memory instead of breaking authentication.
    safeStorageDiscard(storage, MOCK_TOKEN_SESSION_STORAGE_KEY)
  }
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
    status: 'active',
    departmentId: 'company',
    departmentPath: 'company',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 2,
    name: '内容编辑',
    email: 'editor@example.com',
    password: 'editor123',
    avatar: createAvatarDataUri('E', '#059669'),
    role: 'editor',
    status: 'active',
    departmentId: 'product',
    departmentPath: 'company/product',
    createdAt: '2026-02-14T08:00:00.000Z',
  },
  {
    id: 3,
    name: '只读访客',
    email: 'viewer@example.com',
    password: 'viewer123',
    avatar: createAvatarDataUri('V', '#7c3aed'),
    role: 'viewer',
    // AI modified: the documented Viewer demo credential represents an account that can sign in.
    status: 'active',
    departmentId: 'finance',
    departmentPath: 'company/finance',
    createdAt: '2026-04-08T08:00:00.000Z',
  },
  {
    id: 4,
    name: '林晓月',
    email: 'xiaoyue.lin@example.com',
    password: 'viewer123',
    avatar: createAvatarDataUri('林', '#db2777'),
    role: 'viewer',
    status: 'active',
    departmentId: 'product-design',
    departmentPath: 'company/product/design',
    createdAt: '2026-04-22T08:00:00.000Z',
  },
  {
    id: 5,
    name: '陈思远',
    email: 'siyuan.chen@example.com',
    password: 'editor123',
    avatar: createAvatarDataUri('陈', '#0891b2'),
    role: 'editor',
    status: 'active',
    departmentId: 'product',
    departmentPath: 'company/product',
    createdAt: '2026-05-03T08:00:00.000Z',
  },
  {
    id: 6,
    name: '周然',
    email: 'ran.zhou@example.com',
    password: 'viewer123',
    avatar: createAvatarDataUri('周', '#d97706'),
    role: 'viewer',
    status: 'suspended',
    departmentId: 'operations',
    departmentPath: 'company/operations',
    createdAt: '2026-05-18T08:00:00.000Z',
  },
  {
    id: 7,
    name: '吴雪',
    email: 'xue.wu@example.com',
    password: 'editor123',
    avatar: createAvatarDataUri('吴', '#4f46e5'),
    role: 'editor',
    status: 'active',
    departmentId: 'product-engineering',
    departmentPath: 'company/product/engineering',
    createdAt: '2026-06-02T08:00:00.000Z',
  },
  {
    id: 8,
    // AI modified: this stable edge fixture exercises long English identity, empty-avatar, and offset-date rendering.
    name: 'Alexandria Catherine Montgomery-Whittaker Global Operations Reviewer',
    email:
      'alexandria.catherine.montgomery-whittaker.global-operations-reviewer@regional-compliance.example.com',
    password: 'viewer123',
    role: 'viewer',
    status: 'active',
    departmentId: 'finance',
    departmentPath: 'company/finance',
    createdAt: '2026-06-30T09:30:00-07:00',
  },
]

const initialMockUsers = mockUsers.map(user => ({ ...user }))

export function resetMockUsers() {
  mockUsers.splice(0, mockUsers.length, ...initialMockUsers.map(user => ({ ...user })))
}

/** 根据 email 查找用户（不含 password） */
export function findUserByEmail(email: string): AdminUser | undefined {
  const found = mockUsers.find(u => u.email === email)
  if (!found)
    return undefined
  const { password: _password, ...user } = found
  return user
}

/** Create an opaque browser-only session token owned by the in-memory Mock server. */
export function generateMockToken(
  userId: number,
  expiresInSeconds = 60 * 60 * 24,
  tenantId: string | null = null,
): string {
  restoreMockTokenSessions()
  const token = `mock-session-${crypto.randomUUID()}`
  mockTokenSessions.set(token, {
    userId,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    // AI modified: Mock refreshes reproduce the tenant selected by the server at authentication time.
    tenantId,
  })
  while (mockTokenSessions.size > MAX_MOCK_TOKEN_SESSIONS) {
    const oldestToken = mockTokenSessions.keys().next().value
    if (!oldestToken)
      break
    mockTokenSessions.delete(oldestToken)
  }
  // AI modified: tab-scoped Mock records survive reload while production sessions remain backend-owned.
  saveMockTokenSessions()
  return token
}

export function readMockTokenSession(token: string): MockTokenSession {
  restoreMockTokenSessions()
  const session = mockTokenSessions.get(token)
  if (!session)
    return { status: 'invalid' }
  if (session.expiresAt <= Date.now()) {
    mockTokenSessions.delete(token)
    saveMockTokenSessions()
    return { status: 'expired', ...session }
  }
  return { status: 'valid', ...session }
}

export function revokeMockToken(token: string): void {
  mockTokenSessions.delete(token)
  saveMockTokenSessions()
}

export function revokeMockUserSessions(userId: number, retainedToken?: string): void {
  for (const [token, session] of mockTokenSessions) {
    if (session.userId === userId && token !== retainedToken)
      mockTokenSessions.delete(token)
  }
  saveMockTokenSessions()
}

export function resetMockTokenSessions(): void {
  mockTokenSessions.clear()
  saveMockTokenSessions()
  hasRestoredMockTokenSessions = false
}

/** Compatibility helper retained for existing callers. */
export function parseUserIdFromToken(token: string): number | null {
  const session = readMockTokenSession(token)
  return session.status === 'valid' ? session.userId : null
}
