import { describe, expect, it } from 'vite-plus/test'
import {
  evaluateNavigationUrl,
  getNavigationAllowedOrigins,
} from '@/features/navigation/navigation-url-policy'

describe('navigation URL policy', () => {
  const allowedOrigins = getNavigationAllowedOrigins([
    'https://docs.example.com/reference',
    'https://docs.example.com:443',
    'https://user:secret@private.example.com',
    'http://insecure.example.com',
    'ftp://files.example.com',
    'not-a-url',
  ])

  it('canonicalizes configured HTTP origins and ignores invalid entries', () => {
    expect([...allowedOrigins]).toEqual(['https://docs.example.com'])
  })

  it('accepts parsed same-origin paths and configured external origins', () => {
    expect(
      evaluateNavigationUrl('/embedded-help.html?lang=en#start', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({
      isAllowed: true,
      safeUrl: '/embedded-help.html?lang=en#start',
      origin: 'https://admin.example.com',
      isSameOrigin: true,
    })

    expect(
      evaluateNavigationUrl('https://docs.example.com/guide', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toMatchObject({
      isAllowed: true,
      safeUrl: 'https://docs.example.com/guide',
      isSameOrigin: false,
    })

    expect(
      evaluateNavigationUrl('https://docs.example.com:443/guide?q=admin#api', {
        baseOrigin: 'http://localhost:5173',
        allowedOrigins,
      }),
    ).toMatchObject({
      isAllowed: true,
      safeUrl: 'https://docs.example.com/guide?q=admin#api',
    })
  })

  it('rejects cross-origin backslash bypasses after URL parsing', () => {
    expect(
      evaluateNavigationUrl(String.raw`/\evil.example/path`, {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'ORIGIN_NOT_ALLOWED' })
    expect(
      evaluateNavigationUrl('//evil.example/path', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'ORIGIN_NOT_ALLOWED' })
    expect(
      evaluateNavigationUrl('https://api.docs.example.com/path', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'ORIGIN_NOT_ALLOWED' })
    expect(
      evaluateNavigationUrl('https://docs.example.com:8443/path', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'ORIGIN_NOT_ALLOWED' })
  })

  it('requires a base origin for relative URLs and rejects unsafe schemes and credentials', () => {
    expect(
      evaluateNavigationUrl('/help', {
        baseOrigin: undefined,
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'BASE_ORIGIN_REQUIRED' })
    expect(
      evaluateNavigationUrl('javascript:alert(1)', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'UNSUPPORTED_PROTOCOL' })
    expect(
      evaluateNavigationUrl('https://user:secret@docs.example.com/guide', {
        baseOrigin: 'https://admin.example.com',
        allowedOrigins,
      }),
    ).toEqual({ isAllowed: false, reason: 'CREDENTIALS_NOT_ALLOWED' })
  })
})
