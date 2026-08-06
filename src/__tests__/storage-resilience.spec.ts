import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { ACCESS_TOKEN_SESSION_STORAGE_KEY, getSessionAccessToken } from '@/lib/auth-session'
import {
  getBrowserStorage,
  safeStorageDiscard,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from '@/lib/browser-storage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('browser storage resilience', () => {
  it('returns strict fallback results for blocked reads, quota writes, and blocked removals', () => {
    const unavailableStorage = {
      getItem(): string | null {
        throw new DOMException('Storage access denied', 'SecurityError')
      },
      setItem(): void {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      },
      removeItem(): void {
        throw new DOMException('Storage access denied', 'SecurityError')
      },
    } satisfies Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

    expect(safeStorageGet(unavailableStorage, 'preference')).toBeNull()
    expect(safeStorageSet(unavailableStorage, 'preference', 'value')).toBe(false)
    expect(safeStorageRemove(unavailableStorage, 'preference')).toBe(false)
    expect(safeStorageDiscard(unavailableStorage, 'preference')).toBe(false)
  })

  it('writes an empty tombstone when removal fails but storage remains writable', () => {
    let storedPreference = 'stale'
    const partiallyAvailableStorage = {
      removeItem(): void {
        throw new DOMException('Removal denied', 'SecurityError')
      },
      setItem(_key: string, storedValue: string): void {
        storedPreference = storedValue
      },
    } satisfies Pick<Storage, 'removeItem' | 'setItem'>

    expect(safeStorageDiscard(partiallyAvailableStorage, 'preference')).toBe(true)
    expect(storedPreference).toBe('')
  })

  it('handles a browser that blocks resolving the storage property itself', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    expect(getBrowserStorage('local')).toBeUndefined()
  })

  it('reads authorization through the fail-closed session storage boundary', () => {
    sessionStorage.setItem(ACCESS_TOKEN_SESSION_STORAGE_KEY, 'tab-token')
    expect(getSessionAccessToken()).toBe('tab-token')

    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    // AI modified: blocked credential storage behaves as an anonymous request instead of throwing.
    expect(getSessionAccessToken()).toBeNull()
  })

  it('boots and switches locale when persistent storage methods throw', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    })

    const { setLocale } = await import('@/i18n')

    expect(document.documentElement.lang).toMatch(/^(en-US|zh-CN)$/)
    expect(() => setLocale('en-US')).not.toThrow()
    expect(document.documentElement.lang).toBe('en-US')
  })
})
