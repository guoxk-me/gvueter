import type { AxiosResponse } from 'axios'
import type { ApiEnvelope } from '@/lib/http'
import { delay, HttpResponse, http as mswHttp } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { z } from 'zod'
import {
  download,
  get,
  getSafeFileName,
  http as httpClient,
  isCanceledRequest,
  isForbiddenError,
  isUnauthorizedError,
  post,
  put,
  upload,
} from '@/lib/http'
import {
  registerForbiddenHandler,
  registerSessionInvalidationHandler,
  resetSessionInvalidation,
} from '@/lib/request-policy'
import { generateMockToken } from '@/mocks/data/users'
import { server } from '@/mocks/node'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  resetSessionInvalidation()
})

describe('request response policy', () => {
  it('rejects a non-success business code returned with HTTP 200', async () => {
    server.use(
      mswHttp.get('/api/business-failure', () =>
        HttpResponse.json<ApiEnvelope<null>>({
          code: 'RULE_FAILED',
          message: 'Business rule failed',
          data: null,
        }),
      ),
    )

    await expect(get('/business-failure')).rejects.toMatchObject({
      code: 'RULE_FAILED',
      message: 'Business rule failed',
      status: 200,
    })
  })

  it('notifies session invalidation once for concurrent expired-token responses', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(1, -1))
    let invalidationCount = 0
    const unregister = registerSessionInvalidationHandler('http-spec', () => {
      invalidationCount += 1
    })

    try {
      const responses = await Promise.allSettled([get('/users'), get('/roles')])

      expect(responses).toHaveLength(2)
      expect(responses.every((response) => response.status === 'rejected')).toBe(true)
      for (const response of responses) {
        if (response.status === 'rejected') {
          expect(isUnauthorizedError(response.reason)).toBe(true)
        }
      }
      expect(invalidationCount).toBe(1)
    } finally {
      unregister()
    }
  })

  it('ignores a late 401 sent for a credential that has already been replaced', async () => {
    const previousToken = generateMockToken(1)
    const currentToken = generateMockToken(2)
    sessionStorage.setItem('auth_token', previousToken)
    let releaseResponse: (() => void) | undefined
    let markRequestStarted: (() => void) | undefined
    const responseGate = new Promise<void>((resolve) => (releaseResponse = resolve))
    const requestStarted = new Promise<void>((resolve) => (markRequestStarted = resolve))
    server.use(
      mswHttp.get('/api/stale-session', async () => {
        markRequestStarted?.()
        await responseGate
        return HttpResponse.json<ApiEnvelope<null>>(
          { code: 'UNAUTHORIZED', message: 'Expired previous session', data: null },
          { status: 401 },
        )
      }),
    )
    let invalidationCount = 0
    const unregister = registerSessionInvalidationHandler('http-spec', () => {
      invalidationCount += 1
    })

    try {
      const staleRequest = get('/stale-session').catch((error: unknown) => error)
      await requestStarted
      sessionStorage.setItem('auth_token', currentToken)
      releaseResponse?.()
      await staleRequest

      // AI modified: the currently authenticated browser session survives stale transport failures.
      expect(invalidationCount).toBe(0)
      expect(sessionStorage.getItem('auth_token')).toBe(currentToken)
    } finally {
      unregister()
    }
  })

  it('maps forbidden writes and exposes the 403 extension point', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(4))
    let forbiddenCount = 0
    const unregister = registerForbiddenHandler('http-spec', () => {
      forbiddenCount += 1
    })

    try {
      const request = put('/users/1', {
        name: 'Forbidden update',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
      })

      await expect(request).rejects.toSatisfy(isForbiddenError)
      expect(forbiddenCount).toBe(1)
    } finally {
      unregister()
    }
  })

  it('invalidates a suspended account while preserving the transport status', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(6))
    let invalidationCount = 0
    let forbiddenCount = 0
    const unregisterInvalidation = registerSessionInvalidationHandler('http-spec', () => {
      invalidationCount += 1
    })
    const unregisterForbidden = registerForbiddenHandler('http-spec', () => {
      forbiddenCount += 1
    })

    try {
      await expect(get('/auth/me')).rejects.toMatchObject({
        code: 'ACCOUNT_SUSPENDED',
        status: 403,
        category: 'authentication',
        nextAction: 'sign-in',
      })
      // AI modified: a terminal identity state takes the session path, unlike an ordinary 403.
      expect(invalidationCount).toBe(1)
      expect(forbiddenCount).toBe(0)
    } finally {
      unregisterInvalidation()
      unregisterForbidden()
    }
  })

  it('keeps public contract fixtures isolated from the active principal', async () => {
    const activeToken = generateMockToken(1)
    sessionStorage.setItem('auth_token', activeToken)
    let authorizationHeader: string | null = 'not-observed'
    let invalidationCount = 0
    const unregister = registerSessionInvalidationHandler('http-spec', () => {
      invalidationCount += 1
    })
    server.use(
      mswHttp.get('/api/contract-scenarios/failures/unauthorized', ({ request }) => {
        authorizationHeader = request.headers.get('Authorization')
        return HttpResponse.json<ApiEnvelope<null>>(
          { code: 'TOKEN_EXPIRED', message: 'Fixture failure', data: null },
          { status: 401 },
        )
      }),
    )

    try {
      await expect(get('/contract-scenarios/failures/unauthorized')).rejects.toMatchObject({
        code: 'TOKEN_EXPIRED',
        status: 401,
      })
      // AI modified: public failure fixtures cannot receive or invalidate an unrelated user session.
      expect(authorizationHeader).toBeNull()
      expect(invalidationCount).toBe(0)
      expect(sessionStorage.getItem('auth_token')).toBe(activeToken)
    } finally {
      unregister()
    }
  })

  it('keeps SSO entry requests isolated from an unrelated active session', async () => {
    const activeToken = generateMockToken(1)
    sessionStorage.setItem('auth_token', activeToken)
    let exchangeAuthorization: string | null = 'not-observed'
    let startAuthorization: string | null = 'not-observed'
    let invalidationCount = 0
    const unregister = registerSessionInvalidationHandler('http-sso-spec', () => {
      invalidationCount += 1
    })
    server.use(
      mswHttp.post('/api/auth/sso/start', ({ request }) => {
        startAuthorization = request.headers.get('Authorization')
        return HttpResponse.json<ApiEnvelope<{ authorizationUrl: string; expiresAt: number }>>({
          code: 0,
          message: 'success',
          data: {
            authorizationUrl: `${window.location.origin}/sso/callback#ticket=opaque`,
            expiresAt: Date.now() + 60_000,
          },
        })
      }),
      mswHttp.post('/api/auth/sso/exchange', ({ request }) => {
        exchangeAuthorization = request.headers.get('Authorization')
        return HttpResponse.json<ApiEnvelope<null>>(
          { code: 'SSO_TICKET_INVALID', message: 'Invalid SSO ticket', data: null },
          { status: 401 },
        )
      }),
    )

    try {
      await expect(post('/auth/sso/start', { returnTo: '/dashboard' })).resolves.toMatchObject({
        authorizationUrl: expect.stringContaining('/sso/callback'),
      })
      await expect(post('/auth/sso/exchange', { ticket: 'invalid-ticket' })).rejects.toMatchObject({
        code: 'SSO_TICKET_INVALID',
        status: 401,
      })
      // AI modified: a public SSO failure cannot receive or invalidate another principal's bearer.
      expect(startAuthorization).toBeNull()
      expect(exchangeAuthorization).toBeNull()
      expect(invalidationCount).toBe(0)
      expect(sessionStorage.getItem('auth_token')).toBe(activeToken)
    } finally {
      unregister()
    }
  })
})

describe('request concurrency and file helpers', () => {
  it('cancels the older GET when a request with the same key starts', async () => {
    let requestCount = 0
    server.use(
      mswHttp.get('/api/repeated', async () => {
        requestCount += 1
        await delay(30)
        return HttpResponse.json<ApiEnvelope<{ requestCount: number }>>({
          code: 0,
          message: 'success',
          data: { requestCount },
        })
      }),
    )

    const firstRequest = get('/repeated').catch((error: unknown) => error)
    const secondResponse = await get<{ requestCount: number }>('/repeated')
    const firstError = await firstRequest

    expect(isCanceledRequest(firstError)).toBe(true)
    expect(secondResponse.requestCount).toBeGreaterThanOrEqual(1)
  })

  it('uploads multipart data and returns the envelope payload', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({
      data: {
        code: 0,
        message: 'uploaded',
        data: { fileName: 'report.txt', category: 'audit' },
      },
    } as AxiosResponse<ApiEnvelope<{ fileName: string; category: string }>>)

    try {
      const response = await upload<{ fileName: string; category: string }>(
        '/upload',
        new File(['report'], 'report.txt', { type: 'text/plain' }),
        { fieldName: 'document', fields: { category: 'audit' } },
      )

      const formData = postSpy.mock.calls[0]?.[1]
      expect(formData).toBeInstanceOf(FormData)
      expect((formData as FormData).get('category')).toBe('audit')
      expect((formData as FormData).get('document')).toBeInstanceOf(File)
      expect(response).toEqual({ fileName: 'report.txt', category: 'audit' })
    } finally {
      postSpy.mockRestore()
    }
  })

  it('downloads a blob with its server-provided file name', async () => {
    server.use(
      mswHttp.get(
        '/api/export',
        () =>
          new HttpResponse(new Blob(['report']), {
            headers: {
              'Content-Disposition': 'attachment; filename="report.csv"',
              'Content-Type': 'text/csv',
            },
          }),
      ),
    )

    const file = await download('/export')

    expect(file.blob).toBeInstanceOf(Blob)
    expect(file.fileName).toBe('report.csv')
    expect(file.contentType).toContain('text/csv')
  })

  it('recovers JSON authorization errors from failed blob downloads', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(1))
    let invalidationCount = 0
    const unregister = registerSessionInvalidationHandler('http-spec', () => {
      invalidationCount += 1
    })
    server.use(
      mswHttp.get('/api/export', () =>
        HttpResponse.json<ApiEnvelope<null>>(
          { code: 'ACCOUNT_SUSPENDED', message: 'Account suspended', data: null },
          { status: 403 },
        ),
      ),
    )

    try {
      await expect(download('/export')).rejects.toMatchObject({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account suspended',
        status: 403,
        category: 'authentication',
        nextAction: 'sign-in',
      })
      // AI modified: download responses follow the same terminal-session policy as JSON API calls.
      expect(invalidationCount).toBe(1)
    } finally {
      unregister()
    }
  })

  it('removes path and control characters from server-provided file names', () => {
    expect(getSafeFileName('../private\\report.csv')).toBe('report.csv')
    expect(getSafeFileName(`..\0`)).toBeUndefined()
  })

  it('reports malformed API responses with a typed error', async () => {
    server.use(mswHttp.get('/api/malformed', () => HttpResponse.json({ payload: true })))

    await expect(get('/malformed')).rejects.toMatchObject({
      code: 'INVALID_API_ENVELOPE',
    })
  })

  it('rejects endpoint data that fails its runtime response schema', async () => {
    server.use(
      mswHttp.get('/api/runtime-contract', () =>
        HttpResponse.json<ApiEnvelope<{ count: string }>>({
          code: 0,
          message: 'success',
          data: { count: 'not-a-number' },
        }),
      ),
    )

    await expect(
      get<{ count: number }>('/runtime-contract', undefined, {
        responseSchema: z.object({ count: z.number().int().nonnegative() }).strict(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_API_RESPONSE_DATA', category: 'contract' })
  })
})
