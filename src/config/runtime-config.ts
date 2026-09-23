import type { App, InjectionKey } from 'vue'
import type { RuntimeConfig } from './runtime-config-schema'
import { inject } from 'vue'
import {
  RUNTIME_CONFIG_MAX_BYTES,
  RUNTIME_CONFIG_SCHEMA_VERSION,
  validateRuntimeConfig,
} from './runtime-config-schema'

export const RUNTIME_CONFIG_ERROR_CODES = [
  'CONFIG_FETCH_TIMEOUT',
  'CONFIG_FETCH_FAILED',
  'CONFIG_HTTP_STATUS',
  'CONFIG_CONTENT_TYPE',
  'CONFIG_TOO_LARGE',
  'CONFIG_INVALID_JSON',
  'CONFIG_SCHEMA_INVALID',
  'CONFIG_VERSION_UNSUPPORTED',
  'APPLICATION_BOOTSTRAP_FAILED',
] as const

export type RuntimeConfigErrorCode = (typeof RUNTIME_CONFIG_ERROR_CODES)[number]

interface RuntimeConfigClock {
  clearTimeout: (timer: number) => void
  setTimeout: (callback: () => void, delay: number) => number
}

export interface LoadRuntimeConfigOptions {
  baseUrl?: string
  clock?: RuntimeConfigClock
  fetchRequest?: typeof fetch
  maxBytes?: number
  timeoutMs?: number
}

export class RuntimeConfigError extends Error {
  public readonly traceId: string

  constructor(public readonly code: RuntimeConfigErrorCode) {
    super(code)
    this.name = 'RuntimeConfigError'
    this.traceId = crypto.randomUUID()
  }
}

export const RUNTIME_CONFIG_INJECTION_KEY: InjectionKey<RuntimeConfig> = Symbol('runtime-config')

function getRuntimeConfigPath(baseUrl: string): string {
  const basePath = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${basePath}runtime-config.json`
}

function isJsonContentType(contentType: string | null): boolean {
  const mimeType = contentType?.split(';', 1)[0]?.trim().toLowerCase()
  return mimeType === 'application/json' || Boolean(mimeType?.endsWith('+json'))
}

function getDefaultClock(): RuntimeConfigClock {
  return {
    clearTimeout: timer => window.clearTimeout(timer),
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
  }
}

async function requestRuntimeConfig(
  options: Required<Pick<LoadRuntimeConfigOptions, 'baseUrl' | 'fetchRequest' | 'maxBytes' | 'timeoutMs'>>
    & { clock: RuntimeConfigClock },
): Promise<RuntimeConfig> {
  const abortController = new AbortController()
  const timeout = options.clock.setTimeout(() => abortController.abort(), options.timeoutMs)
  let response: Response

  try {
    response = await options.fetchRequest(getRuntimeConfigPath(options.baseUrl), {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal: abortController.signal,
    })
  }
  catch {
    if (abortController.signal.aborted)
      throw new RuntimeConfigError('CONFIG_FETCH_TIMEOUT')
    throw new RuntimeConfigError('CONFIG_FETCH_FAILED')
  }
  finally {
    options.clock.clearTimeout(timeout)
  }

  if (!response.ok)
    throw new RuntimeConfigError('CONFIG_HTTP_STATUS')
  if (!isJsonContentType(response.headers.get('content-type')))
    throw new RuntimeConfigError('CONFIG_CONTENT_TYPE')

  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > options.maxBytes)
    throw new RuntimeConfigError('CONFIG_TOO_LARGE')

  const responseBody = await response.text()
  if (new TextEncoder().encode(responseBody).byteLength > options.maxBytes)
    throw new RuntimeConfigError('CONFIG_TOO_LARGE')

  let candidate: unknown
  try {
    candidate = JSON.parse(responseBody) as unknown
  }
  catch {
    throw new RuntimeConfigError('CONFIG_INVALID_JSON')
  }

  if (
    typeof candidate === 'object'
    && candidate !== null
    && 'schemaVersion' in candidate
    && candidate.schemaVersion !== RUNTIME_CONFIG_SCHEMA_VERSION
  ) {
    throw new RuntimeConfigError('CONFIG_VERSION_UNSUPPORTED')
  }

  try {
    return validateRuntimeConfig(candidate)
  }
  catch {
    throw new RuntimeConfigError('CONFIG_SCHEMA_INVALID')
  }
}

export async function loadRuntimeConfig(
  options: LoadRuntimeConfigOptions = {},
): Promise<RuntimeConfig> {
  const requestOptions = {
    baseUrl: options.baseUrl ?? import.meta.env.BASE_URL,
    clock: options.clock ?? getDefaultClock(),
    fetchRequest: options.fetchRequest ?? window.fetch.bind(window),
    maxBytes: options.maxBytes ?? RUNTIME_CONFIG_MAX_BYTES,
    timeoutMs: options.timeoutMs ?? 5_000,
  }

  // AI modified: startup uses only the deployed schema and never falls back to retired business configuration.
  return requestRuntimeConfig(requestOptions)
}

export function provideRuntimeConfig(app: App, runtimeConfig: RuntimeConfig): void {
  app.provide(RUNTIME_CONFIG_INJECTION_KEY, runtimeConfig)
}

export function useRuntimeConfig(): RuntimeConfig {
  const runtimeConfig = inject(RUNTIME_CONFIG_INJECTION_KEY)
  if (!runtimeConfig)
    throw new Error('Runtime Config is unavailable before application bootstrap.')
  return runtimeConfig
}
