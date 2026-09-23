import type { RuntimeConfigError } from '@/config/runtime-config'
import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from '@/config/runtime-config'
import {
  RUNTIME_CONFIG_SCHEMA_VERSION,
  validateRuntimeConfig,
} from '@/config/runtime-config-schema'

describe('runtime configuration', () => {
  it('accepts a same-origin API path for a standalone deployment', () => {
    expect(validateRuntimeConfig({
      schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
      api: { baseUrl: '/api' },
    }).api.baseUrl).toBe('/api')
  })

  it('rejects removed business configuration fields', () => {
    expect(() => validateRuntimeConfig({
      schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
      api: { baseUrl: '/api' },
      notifications: { url: null, allowedOrigins: [] },
    })).toThrow()
  })

  it('rejects credential-bearing and insecure remote endpoints', () => {
    for (const baseUrl of ['http://example.com/api', 'https://user:pass@example.com/api', '//example.com/api']) {
      expect(() => validateRuntimeConfig({
        schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
        api: { baseUrl },
      })).toThrow()
    }
  })

  it('loads deployment configuration without caching or accepting retired fields', async () => {
    const fetchRequest = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      expect(init?.cache).toBe('no-store')
      return new Response(JSON.stringify({
        schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
        api: { baseUrl: '/api/v1' },
      }), { headers: { 'content-type': 'application/json' } })
    }

    const config = await loadRuntimeConfig({ baseUrl: '/admin/', fetchRequest: fetchRequest as typeof fetch })
    expect(config.api.baseUrl).toBe('/api/v1')
  })

  it('fails closed when a deployment still serves the old schema', async () => {
    const fetchRequest = async (): Promise<Response> => new Response(JSON.stringify({
      schemaVersion: 1,
      api: { baseUrl: '/api' },
    }), { headers: { 'content-type': 'application/json' } })

    await expect(loadRuntimeConfig({ fetchRequest: fetchRequest as typeof fetch }))
      .rejects
      .toMatchObject<Partial<RuntimeConfigError>>({ code: 'CONFIG_VERSION_UNSUPPORTED' })
  })
})
