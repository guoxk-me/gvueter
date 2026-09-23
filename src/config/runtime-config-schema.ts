import { z } from 'zod'

// AI modified: the skeleton accepts only the API endpoint needed for future backend wiring.
export const RUNTIME_CONFIG_SCHEMA_VERSION = 2
export const RUNTIME_CONFIG_MAX_BYTES = 32 * 1024

function isApiBaseUrl(apiBaseUrl: string): boolean {
  if (apiBaseUrl.startsWith('/'))
    return !apiBaseUrl.startsWith('//') && !/[\\\s?#]/.test(apiBaseUrl)

  try {
    const url = new URL(apiBaseUrl)
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
  }
  catch {
    return false
  }
}

export const RUNTIME_CONFIG_SCHEMA = z.object({
  schemaVersion: z.literal(RUNTIME_CONFIG_SCHEMA_VERSION),
  api: z.object({
    baseUrl: z.string().min(1).max(2_048).refine(isApiBaseUrl, 'Invalid API base URL.'),
  }).strict(),
}).strict()

export type RuntimeConfig = Readonly<z.infer<typeof RUNTIME_CONFIG_SCHEMA>>

export function validateRuntimeConfig(candidate: unknown): RuntimeConfig {
  const config = RUNTIME_CONFIG_SCHEMA.parse(candidate)
  return Object.freeze({
    schemaVersion: config.schemaVersion,
    api: Object.freeze({ ...config.api }),
  })
}
