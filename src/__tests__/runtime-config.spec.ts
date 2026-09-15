import { describe, expect, it, vi } from 'vitest'
import {
  loadRuntimeConfig,
  RuntimeConfigError,
} from '@/config/runtime-config'
import { validateRuntimeConfig } from '@/config/runtime-config-schema'

const validConfig = {
  schemaVersion: 1,
  api: { baseUrl: '/api/v1' },
  notifications: { url: null, allowedOrigins: [] },
  navigation: {
    externalOrigins: ['https://docs.example.com'],
    iframeOrigins: ['https://reports.example.com'],
  },
} as const

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

describe('runtime configuration', () => {
  it('loads a Base-relative JSON document and freezes deployment state', async () => {
    const fetchRequest = vi.fn<typeof fetch>(async () => jsonResponse(validConfig))

    const runtimeConfig = await loadRuntimeConfig({
      baseUrl: '/admin/',
      fetchRequest,
    })

    expect(fetchRequest).toHaveBeenCalledWith(
      '/admin/runtime-config.json',
      expect.objectContaining({ cache: 'no-store', credentials: 'same-origin' }),
    )
    expect(runtimeConfig).toEqual(validConfig)
    expect(Object.isFrozen(runtimeConfig)).toBe(true)
    expect(Object.isFrozen(runtimeConfig.navigation.externalOrigins)).toBe(true)
  })

  it.each([
    ['CONFIG_HTTP_STATUS', new Response('', { status: 503 })],
    ['CONFIG_CONTENT_TYPE', new Response('{}', { headers: { 'content-type': 'text/html' } })],
    [
      'CONFIG_TOO_LARGE',
      new Response('{}', {
        headers: { 'content-length': String(32 * 1024 + 1), 'content-type': 'application/json' },
      }),
    ],
    [
      'CONFIG_INVALID_JSON',
      new Response('{', { headers: { 'content-type': 'application/json' } }),
    ],
    ['CONFIG_SCHEMA_INVALID', jsonResponse({ ...validConfig, unexpected: true })],
    ['CONFIG_VERSION_UNSUPPORTED', jsonResponse({ ...validConfig, schemaVersion: 2 })],
  ])('reports %s without exposing the response body', async (expectedCode, response) => {
    const fetchRequest = vi.fn<typeof fetch>(async () => response)

    await expect(loadRuntimeConfig({ fetchRequest })).rejects.toMatchObject({
      code: expectedCode,
      message: expectedCode,
      traceId: expect.any(String),
    })
  })

  it('aborts after the configured timeout without an automatic retry', async () => {
    let triggerTimeout: (() => void) | undefined
    const fetchRequest = vi.fn<typeof fetch>((_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }))

    const request = loadRuntimeConfig({
      clock: {
        clearTimeout: vi.fn(),
        setTimeout(callback) {
          triggerTimeout = callback
          return 1
        },
      },
      fetchRequest,
      timeoutMs: 5_000,
    })
    triggerTimeout?.()

    await expect(request).rejects.toMatchObject({ code: 'CONFIG_FETCH_TIMEOUT' })
    expect(fetchRequest).toHaveBeenCalledOnce()
  })

  it('uses the whole Legacy configuration only for an unreadable runtime document', async () => {
    const legacyConfig = validateRuntimeConfig(validConfig)
    const missingConfig = vi.fn<typeof fetch>(async () => new Response('', { status: 404 }))
    const invalidConfig = vi.fn<typeof fetch>(async () => jsonResponse({ schemaVersion: 1 }))

    await expect(loadRuntimeConfig({ fetchRequest: missingConfig, legacyConfig })).resolves.toBe(
      legacyConfig,
    )
    await expect(loadRuntimeConfig({ fetchRequest: invalidConfig, legacyConfig })).rejects.toBeInstanceOf(
      RuntimeConfigError,
    )
  })

  it('rejects insecure API, notification, and navigation deployment values', () => {
    expect(() => validateRuntimeConfig({
      ...validConfig,
      api: { baseUrl: 'http://api.example.com' },
    })).toThrow()
    expect(() => validateRuntimeConfig({
      ...validConfig,
      notifications: { url: 'ws://admin.example.com/events', allowedOrigins: [] },
    })).toThrow()
    expect(() => validateRuntimeConfig({
      ...validConfig,
      navigation: { externalOrigins: ['https://docs.example.com/path'], iframeOrigins: [] },
    })).toThrow()
  })
})
