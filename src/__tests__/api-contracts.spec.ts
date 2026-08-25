import type { ResponseDataSchema } from '@/lib/http'
import { HttpResponse, http as mswHttp } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONTENT_FILE_LIST_RESPONSE_SCHEMA } from '@/features/content-admin/content-admin-api-contracts'
import { DASHBOARD_OVERVIEW_SCHEMA } from '@/features/dashboard/dashboard-api-contracts'
import { MONITORING_OVERVIEW_SCHEMA } from '@/features/monitoring/monitoring-api-contracts'
import { ROLE_LIST_RESPONSE_SCHEMA } from '@/features/roles/role-api-contracts'
import { SYSTEM_CONFIG_SCHEMA } from '@/features/system-config/system-config-api-contracts'
import {
  API_ENVELOPE_SCHEMA,
  API_ERROR_DETAILS_SCHEMA,
  BUSINESS_TIME_ZONE_SCHEMA,
  MAX_JSON_DEPTH,
  PAGE_REQUEST_SCHEMA,
  PAGE_RESPONSE_SCHEMA,
  UPLOAD_RECEIPT_SCHEMA,
} from '@/lib/api-contracts'
import { ApiError, get, http } from '@/lib/http'
import { reportUnhandledBrowserRequest } from '@/mocks/browser-request-boundary'
import { generateMockToken } from '@/mocks/data/users'
import { CONTRACT_FAILURE_SCENARIOS } from '@/mocks/handlers/contract-scenarios'
import { server } from '@/mocks/node'

afterEach(() => {
  sessionStorage.clear()
})

describe('browser Mock request boundary', () => {
  it.each([
    '/@vite/client',
    '/src/main.ts',
    '/src/layouts/AuthLayout.vue?vue&type=script&lang.ts',
    '/favicon.ico',
    '/assets/application.js',
  ])('bypasses the non-API resource %s', (resourcePath) => {
    const reportError = vi.fn()

    reportUnhandledBrowserRequest(
      new Request(new URL(resourcePath, 'http://127.0.0.1:3001')),
      { error: reportError },
      'http://127.0.0.1:3001',
    )

    expect(reportError).not.toHaveBeenCalled()
  })

  it.each(['/api', '/api/users', '/api/system-config?fresh=true'])(
    'rejects the unhandled application API %s',
    (apiPath) => {
      const reportError = vi.fn()

      reportUnhandledBrowserRequest(
        new Request(new URL(apiPath, 'http://127.0.0.1:3001')),
        { error: reportError },
        'http://127.0.0.1:3001',
      )

      expect(reportError).toHaveBeenCalledOnce()
    },
  )

  it('does not claim a cross-origin API namespace', () => {
    const reportError = vi.fn()

    reportUnhandledBrowserRequest(
      new Request('https://service.example.com/api/users'),
      { error: reportError },
      'http://127.0.0.1:3001',
    )

    expect(reportError).not.toHaveBeenCalled()
  })
})

describe('aPI schemas', () => {
  it('accepts the canonical envelope and one-based page contract', () => {
    expect(
      API_ENVELOPE_SCHEMA.parse({
        code: 0,
        message: 'success',
        data: { items: [], total: 0, page: 1, pageSize: 10 },
      }),
    ).toBeTruthy()
    expect(PAGE_REQUEST_SCHEMA.parse({ page: 1, pageSize: 10, sortDirection: 'asc' })).toBeTruthy()
    expect(PAGE_RESPONSE_SCHEMA.parse({ items: [], total: 0, page: 1, pageSize: 10 })).toBeTruthy()
  })

  it('rejects missing envelope data, zero-based network pages, and out-of-budget page sizes', () => {
    expect(API_ENVELOPE_SCHEMA.safeParse({ code: 0, message: 'success' }).success).toBe(false)
    expect(PAGE_REQUEST_SCHEMA.safeParse({ page: 0, pageSize: 10 }).success).toBe(false)
    expect(PAGE_REQUEST_SCHEMA.safeParse({ page: 1, pageSize: 500 }).success).toBe(false)
    expect(
      PAGE_RESPONSE_SCHEMA.safeParse({
        items: [{ id: 1 }, { id: 2 }],
        total: 1,
        page: 1,
        pageSize: 1,
      }).success,
    ).toBe(false)
  })

  it('bounds generic JSON depth and rejects cyclic values without recursive overflow', () => {
    let nestedValue: unknown = 'leaf'
    for (let depth = 0; depth <= MAX_JSON_DEPTH; depth += 1) {
      nestedValue = { child: nestedValue }
    }
    const cyclicValue: { child?: unknown } = {}
    cyclicValue.child = cyclicValue

    expect(
      API_ENVELOPE_SCHEMA.safeParse({ code: 0, message: 'success', data: nestedValue }).success,
    ).toBe(false)
    expect(
      API_ENVELOPE_SCHEMA.safeParse({ code: 0, message: 'success', data: cyclicValue }).success,
    ).toBe(false)
  })

  it('enforces upload timestamps, safe file names, and IANA business time zones', () => {
    expect(
      UPLOAD_RECEIPT_SCHEMA.safeParse({
        fileId: 'file-1',
        fileName: 'quarterly-report.csv',
        contentType: 'text/csv',
        sizeBytes: 2048,
        uploadedAt: '2026-07-15T08:30:00+08:00',
      }).success,
    ).toBe(true)
    expect(
      UPLOAD_RECEIPT_SCHEMA.safeParse({
        fileId: 'file-1',
        fileName: '',
        contentType: 'text/csv',
        sizeBytes: -1,
        uploadedAt: '2026-07-15 08:30:00',
      }).success,
    ).toBe(false)
    expect(BUSINESS_TIME_ZONE_SCHEMA.safeParse('Asia/Shanghai').success).toBe(true)
    expect(BUSINESS_TIME_ZONE_SCHEMA.safeParse('local').success).toBe(false)
  })

  it('supports field errors, request IDs, and extension-safe error details', () => {
    expect(
      API_ERROR_DETAILS_SCHEMA.parse({
        requestId: 'request-123',
        fieldErrors: {
          email: ['Email is already registered'],
          path: 'ROUTE_FIELD_NOT_ALLOWED',
        },
        resourceVersion: 12,
      }),
    ).toMatchObject({ requestId: 'request-123', resourceVersion: 12 })
  })
})

describe('mock failure matrix', () => {
  it.each([
    ['unauthorized', 'authentication', 'sign-in', 401],
    ['forbidden', 'authorization', 'request-access', 403],
    ['conflict', 'conflict', 'refresh', 409],
    ['validation', 'validation', 'review-input', 422],
    ['server-error', 'server', 'retry', 500],
  ] as const)(
    'classifies %s with a recovery action and request ID',
    async (scenario, category, nextAction, status) => {
      expect(CONTRACT_FAILURE_SCENARIOS).toContain(scenario)
      const failure = await get(`/contract-scenarios/failures/${scenario}`).catch(
        (error: unknown) => error,
      )

      expect(failure).toBeInstanceOf(ApiError)
      expect(failure).toMatchObject({
        category,
        nextAction,
        status,
        requestId: `mock-${scenario}-request`,
      })
    },
  )

  it('supports deterministic delay and client timeout scenarios', async () => {
    await expect(get<{ delayed: true }>('/contract-scenarios/delay')).resolves.toEqual({
      delayed: true,
    })

    const failure = await http
      .get('/contract-scenarios/timeout', {
        adapter: 'http',
        baseURL: 'http://localhost:3000/api',
        timeout: 10,
      })
      .catch((error: unknown) => error)
    expect(failure).toMatchObject({
      category: 'timeout',
      code: 'REQUEST_TIMEOUT',
      nextAction: 'retry',
    })
    expect((failure as ApiError).requestId).toBeTruthy()
  })
})

describe('feature response contracts', () => {
  it.each([
    ['/api/dashboard/overview', '/dashboard/overview', DASHBOARD_OVERVIEW_SCHEMA],
    ['/api/roles', '/roles', ROLE_LIST_RESPONSE_SCHEMA],
    ['/api/system-config', '/system-config', SYSTEM_CONFIG_SCHEMA],
    ['/api/monitoring/overview', '/monitoring/overview', MONITORING_OVERVIEW_SCHEMA],
    ['/api/content-files', '/content-files', CONTENT_FILE_LIST_RESPONSE_SCHEMA],
  ] as const)(
    'rejects malformed successful payloads from %s',
    async (mockPath, clientPath, responseSchema) => {
      sessionStorage.setItem('auth_token', generateMockToken(1))
      server.use(
        mswHttp.get(mockPath, () =>
          HttpResponse.json({
            code: 0,
            message: 'success',
            data: { unexpected: true },
          })),
      )

      // AI modified: representative feature payloads are rejected before stores, charts, or tables consume them.
      await expect(
        get<unknown>(clientPath, undefined, {
          responseSchema: responseSchema as ResponseDataSchema<unknown>,
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_API_RESPONSE_DATA',
        category: 'contract',
      })
    },
  )
})
