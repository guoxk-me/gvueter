import { z } from 'zod'

export const RUNTIME_CONFIG_SCHEMA_VERSION = 1
export const RUNTIME_CONFIG_MAX_BYTES = 32 * 1024

function isExactSecureOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'https:'
      && !url.username
      && !url.password
      && url.pathname === '/'
      && !url.search
      && !url.hash
      && url.origin === origin
    )
  }
  catch {
    return false
  }
}

function isExactSecureWebSocketOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.protocol === 'wss:'
      && !url.username
      && !url.password
      && url.pathname === '/'
      && !url.search
      && !url.hash
      && url.origin === origin
    )
  }
  catch {
    return false
  }
}

function isApiBaseUrl(apiBaseUrl: string): boolean {
  if (apiBaseUrl.startsWith('/'))
    return !apiBaseUrl.startsWith('//') && !/[\\\s?#]/.test(apiBaseUrl)

  try {
    const url = new URL(apiBaseUrl)
    return (
      url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
    )
  }
  catch {
    return false
  }
}

function isNotificationUrl(notificationUrl: string): boolean {
  try {
    const url = new URL(notificationUrl)
    return (
      url.protocol === 'wss:'
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
    )
  }
  catch {
    return false
  }
}

const secureOriginsSchema = z.array(
  z.string().refine(isExactSecureOrigin, 'Expected an exact HTTPS origin.'),
).max(64)

export const RUNTIME_CONFIG_SCHEMA = z.object({
  schemaVersion: z.literal(RUNTIME_CONFIG_SCHEMA_VERSION),
  api: z.object({
    baseUrl: z.string().min(1).max(2_048).refine(isApiBaseUrl, 'Invalid API base URL.'),
  }).strict(),
  notifications: z.object({
    url: z.union([
      z.null(),
      z.string().min(1).max(2_048).refine(isNotificationUrl, 'Invalid notification URL.'),
    ]),
    allowedOrigins: z.array(
      z.string().refine(
        isExactSecureWebSocketOrigin,
        'Expected an exact secure WebSocket origin.',
      ),
    ).max(64),
  }).strict(),
  navigation: z.object({
    externalOrigins: secureOriginsSchema,
    iframeOrigins: secureOriginsSchema,
  }).strict(),
}).strict()

type RuntimeConfigInput = z.infer<typeof RUNTIME_CONFIG_SCHEMA>

export interface RuntimeConfig {
  readonly schemaVersion: typeof RUNTIME_CONFIG_SCHEMA_VERSION
  readonly api: Readonly<RuntimeConfigInput['api']>
  readonly notifications: Readonly<{
    url: string | null
    allowedOrigins: readonly string[]
  }>
  readonly navigation: Readonly<{
    externalOrigins: readonly string[]
    iframeOrigins: readonly string[]
  }>
}

export function validateRuntimeConfig(candidate: unknown): RuntimeConfig {
  const config = RUNTIME_CONFIG_SCHEMA.parse(candidate)

  // AI modified: deployment configuration is immutable for the lifetime of one document.
  return Object.freeze({
    schemaVersion: config.schemaVersion,
    api: Object.freeze({ ...config.api }),
    notifications: Object.freeze({
      url: config.notifications.url,
      allowedOrigins: Object.freeze([...config.notifications.allowedOrigins]),
    }),
    navigation: Object.freeze({
      externalOrigins: Object.freeze([...config.navigation.externalOrigins]),
      iframeOrigins: Object.freeze([...config.navigation.iframeOrigins]),
    }),
  })
}
