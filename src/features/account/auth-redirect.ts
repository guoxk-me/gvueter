const DEFAULT_POST_AUTHENTICATION_PATH = '/dashboard'

export function getPostAuthenticationPath(candidate: unknown): string {
  if (typeof candidate !== 'string' || !candidate.startsWith('/')) {
    return DEFAULT_POST_AUTHENTICATION_PATH
  }

  let decodedCandidate = candidate
  try {
    for (let decodePass = 0; decodePass < 2; decodePass += 1) {
      decodedCandidate = decodeURIComponent(decodedCandidate)
    }
  } catch {
    return DEFAULT_POST_AUTHENTICATION_PATH
  }

  // AI modified: password and SSO redirects share one strict same-origin path boundary.
  const hasControlCharacter = [...decodedCandidate].some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)
  })
  if (decodedCandidate.startsWith('//') || decodedCandidate.includes('\\') || hasControlCharacter) {
    return DEFAULT_POST_AUTHENTICATION_PATH
  }

  return candidate
}

export function getSafeSsoAuthorizationUrl(candidate: unknown): string | null {
  if (typeof window === 'undefined') return null
  if (typeof candidate !== 'string' || !candidate.trim()) return null

  try {
    const applicationOrigin = window.location.origin
    const authorizationUrl = new URL(candidate, `${applicationOrigin}/`)
    if (authorizationUrl.username || authorizationUrl.password) return null
    if (authorizationUrl.origin === applicationOrigin) return authorizationUrl.toString()
    // AI modified: external identity-provider navigation requires HTTPS and never accepts credentials.
    return authorizationUrl.protocol === 'https:' ? authorizationUrl.toString() : null
  } catch {
    return null
  }
}
