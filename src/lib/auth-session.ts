import { getBrowserStorage, safeStorageGet } from '@/lib/browser-storage'

export const ACCESS_TOKEN_SESSION_STORAGE_KEY = 'auth_token'

export function getSessionAccessToken(): string | null {
  // AI modified: authorization uses the shared fail-closed, tab-scoped storage boundary.
  return safeStorageGet(getBrowserStorage('session'), ACCESS_TOKEN_SESSION_STORAGE_KEY)
}
