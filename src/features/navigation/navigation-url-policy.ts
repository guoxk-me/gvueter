export type NavigationUrlRejectionReason
  = | 'EMPTY_URL'
    | 'BASE_ORIGIN_REQUIRED'
    | 'INVALID_BASE_ORIGIN'
    | 'INVALID_URL'
    | 'UNSUPPORTED_PROTOCOL'
    | 'CREDENTIALS_NOT_ALLOWED'
    | 'ORIGIN_NOT_ALLOWED'

export type NavigationUrlDecision
  = | {
    isAllowed: true
    safeUrl: string
    origin: string
    isSameOrigin: boolean
  }
  | {
    isAllowed: false
    reason: NavigationUrlRejectionReason
  }

export interface NavigationUrlPolicy {
  baseOrigin: string | undefined
  allowedOrigins: ReadonlySet<string>
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === 'https:' || protocol === 'http:'
}

export function getNavigationAllowedOrigins(originEntries: readonly string[]): ReadonlySet<string> {
  const allowedOrigins = new Set<string>()

  for (const originEntry of originEntries) {
    try {
      const originUrl = new URL(originEntry.trim())
      // AI modified: configured cross-origin targets require HTTPS and cannot smuggle credentials.
      if (originUrl.protocol === 'https:' && !originUrl.username && !originUrl.password)
        allowedOrigins.add(originUrl.origin)
    }
    catch {
      // Invalid deployment entries are ignored instead of weakening the policy.
    }
  }

  return allowedOrigins
}

// AI modified: cross-origin navigation trust comes only from deployment configuration.
export const navigationAllowedOrigins = getNavigationAllowedOrigins(
  (import.meta.env.VITE_NAVIGATION_ALLOWED_ORIGINS ?? '').split(','),
)

/**
 * Applies the same URL decision at form, API mock, and runtime boundaries.
 * The base origin is explicit so relative paths cannot be mistaken for trusted URLs.
 */
export function evaluateNavigationUrl(
  requestedUrl: string | undefined,
  policy: NavigationUrlPolicy,
): NavigationUrlDecision {
  const targetText = requestedUrl?.trim()
  if (!targetText)
    return { isAllowed: false, reason: 'EMPTY_URL' }

  let baseUrl: URL | undefined
  if (policy.baseOrigin) {
    try {
      baseUrl = new URL(policy.baseOrigin)
    }
    catch {
      return { isAllowed: false, reason: 'INVALID_BASE_ORIGIN' }
    }

    if (!isHttpProtocol(baseUrl.protocol))
      return { isAllowed: false, reason: 'INVALID_BASE_ORIGIN' }
  }

  let targetUrl: URL
  try {
    targetUrl = baseUrl ? new URL(targetText, `${baseUrl.origin}/`) : new URL(targetText)
  }
  catch {
    return {
      isAllowed: false,
      reason: baseUrl ? 'INVALID_URL' : 'BASE_ORIGIN_REQUIRED',
    }
  }

  if (!isHttpProtocol(targetUrl.protocol))
    return { isAllowed: false, reason: 'UNSUPPORTED_PROTOCOL' }
  if (targetUrl.username || targetUrl.password)
    return { isAllowed: false, reason: 'CREDENTIALS_NOT_ALLOWED' }

  const isSameOrigin = targetUrl.origin === baseUrl?.origin
  if (!isSameOrigin && !policy.allowedOrigins.has(targetUrl.origin))
    return { isAllowed: false, reason: 'ORIGIN_NOT_ALLOWED' }

  // AI modified: only a parsed same-origin URL is reduced back to a local path.
  const safeUrl = isSameOrigin
    ? `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
    : targetUrl.href

  return {
    isAllowed: true,
    safeUrl,
    origin: targetUrl.origin,
    isSameOrigin,
  }
}
