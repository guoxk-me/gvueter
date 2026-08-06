import type { PositionRecord } from '@/features/positions/types'
import type { CaptchaChallenge } from '@/types/auth'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { isUploadFileNameSafe, isUploadFileTypeAllowed } from '@/components/admin'
import { updateRolePermissions } from '@/features/roles/role-policy'
import { ApiError, del, get, http as httpClient, post, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { solveCaptchaChallenge } from './auth-test-helpers'

async function requestPasswordLogin(email: string, password: string): Promise<ApiError> {
  const captcha = await get<CaptchaChallenge>('/auth/captcha')
  try {
    await post('/auth/login', {
      email,
      password,
      captchaId: captcha.captchaId,
      captchaCode: solveCaptchaChallenge(captcha.challenge),
      provider: 'password',
    })
  } catch (error: unknown) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('Expected password login to fail')
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('authentication disclosure controls', () => {
  it('returns the same failure for an unknown account and a wrong password', async () => {
    const wrongPassword = await requestPasswordLogin('admin@example.com', 'wrong-password')
    const unknownAccount = await requestPasswordLogin('missing@example.com', 'wrong-password')

    // AI modified: compare the public contract so future copy changes cannot reintroduce enumeration.
    expect(wrongPassword).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: '邮箱或密码不正确',
      status: 401,
    })
    expect(unknownAccount).toMatchObject({
      code: wrongPassword.code,
      message: wrongPassword.message,
      status: wrongPassword.status,
    })
  })

  it('returns the same forgot-password envelope for known and unknown accounts', async () => {
    await expect(
      post<null>('/auth/forgot-password', {
        email: 'admin@example.com',
      }),
    ).resolves.toBeNull()
    await expect(
      post<null>('/auth/forgot-password', {
        email: 'missing@example.com',
      }),
    ).resolves.toBeNull()
  })

  it('repeats password rules at the API boundary', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(1))

    await expect(
      post('/auth/change-password', {
        currentPassword: 'admin123',
        newPassword: 'admin123',
      }),
    ).rejects.toMatchObject({ code: 'PASSWORD_UNCHANGED', status: 400 })
    await expect(
      post('/auth/reset-password', {
        token: 'invalid-token',
        newPassword: 'weak',
      }),
    ).rejects.toMatchObject({ code: 'WEAK_PASSWORD', status: 400 })
  })

  it('keeps reset-token failures separate from authenticated session failures', async () => {
    const activeToken = generateMockToken(1)
    sessionStorage.setItem('auth_token', activeToken)

    await expect(
      post('/auth/reset-password', {
        token: 'invalid-reset-token',
        newPassword: 'ValidReset123',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_RESET_TOKEN',
      status: 400,
      category: 'client',
      nextAction: 'review-input',
    })

    // AI modified: a public reset attempt cannot invalidate or replace an unrelated signed-in principal.
    expect(sessionStorage.getItem('auth_token')).toBe(activeToken)
  })

  it('returns typed 400 envelopes for malformed and structurally invalid JSON bodies', async () => {
    await expect(
      httpClient.post('/auth/login', '{', {
        headers: { 'Content-Type': 'application/json' },
        transformRequest: [(body: unknown) => body],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_JSON_BODY', status: 400 })
    await expect(
      post('/auth/login', {
        email: 42,
        password: 'admin123',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST_BODY', status: 400 })

    sessionStorage.setItem('auth_token', generateMockToken(1))
    await expect(
      post('/users', {
        name: 'Invalid role',
        email: 'invalid.role@example.com',
        role: 'owner',
        status: 'active',
        temporaryPassword: 'ChangeMe123!',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST_BODY', status: 400 })
  })
})

describe('backend permission boundaries', () => {
  it('denies Settings management reads without read Settings permission', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))

    for (const endpoint of [
      '/system-config',
      '/departments',
      '/positions',
      '/dictionaries/types',
      '/dictionaries/types/account-status/entries',
    ]) {
      await expect(get(endpoint)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      })
    }
  })

  it('denies Content reads after the backend role policy removes read Content', async () => {
    updateRolePermissions('viewer', [{ action: 'read', subject: 'Dashboard' }])
    sessionStorage.setItem('auth_token', generateMockToken(3))

    for (const endpoint of [
      '/announcements',
      '/operation-logs',
      '/form-workbench/title-availability?title=Quarterly%20review',
    ]) {
      await expect(get(endpoint)).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      })
    }
  })

  it('applies an updated editor policy immediately across business APIs', async () => {
    updateRolePermissions('editor', [
      { action: 'create', subject: 'Settings' },
      { action: 'delete', subject: 'Settings' },
      { action: 'delete', subject: 'Content' },
      { action: 'create', subject: 'User' },
      { action: 'update', subject: 'User' },
    ])
    sessionStorage.setItem('auth_token', generateMockToken(2))

    const position = await post<PositionRecord>('/positions', {
      code: 'policy-test',
      name: 'Policy Test',
      description: 'Confirms dynamic authorization.',
      order: 99,
      status: 'active',
    })
    await expect(del(`/positions/${position.id}`)).resolves.toBeNull()
    await expect(del('/announcements/announcement-release')).resolves.toBeNull()
    await expect(
      put('/users/5', {
        name: 'Editor-scoped update',
        email: 'siyuan.chen@example.com',
        role: 'editor',
        status: 'active',
      }),
    ).resolves.toMatchObject({ name: 'Editor-scoped update' })
    await expect(
      put('/users/3', {
        name: 'Out-of-scope update',
        email: 'viewer@example.com',
        role: 'viewer',
        status: 'suspended',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
    await expect(
      put('/users/5', {
        name: 'Privilege escalation',
        email: 'siyuan.chen@example.com',
        role: 'admin',
        status: 'active',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_ASSIGNMENT_FORBIDDEN', status: 403 })
    await expect(
      post('/users', {
        name: 'Scoped viewer',
        email: 'scoped.viewer@example.com',
        role: 'viewer',
        status: 'active',
        temporaryPassword: 'ChangeMe123!',
      }),
    ).resolves.toMatchObject({ role: 'viewer' })
    await expect(
      post('/users', {
        name: 'Unauthorized administrator',
        email: 'unauthorized.admin@example.com',
        role: 'admin',
        status: 'active',
        temporaryPassword: 'ChangeMe123!',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_ASSIGNMENT_FORBIDDEN', status: 403 })
    await expect(
      post('/announcements', {
        title: 'No create grant',
        content: '<p>This write must be denied.</p>',
        priority: 'normal',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })
})

describe('upload metadata policy', () => {
  const imagePolicy = {
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  } as const

  it('requires safe names plus matching extension and MIME allow-lists', () => {
    expect(isUploadFileNameSafe('avatar.png')).toBe(true)
    expect(isUploadFileNameSafe('../avatar.png')).toBe(false)
    expect(isUploadFileNameSafe('avatar.png.')).toBe(false)

    expect(
      isUploadFileTypeAllowed(
        new File(['image'], 'avatar.png', { type: 'image/png' }),
        imagePolicy,
      ),
    ).toBe(true)
    expect(
      isUploadFileTypeAllowed(
        new File(['svg'], 'avatar.svg', { type: 'image/svg+xml' }),
        imagePolicy,
      ),
    ).toBe(false)
    expect(
      isUploadFileTypeAllowed(
        new File(['image'], 'avatar.png', { type: 'text/html' }),
        imagePolicy,
      ),
    ).toBe(false)
  })
})
