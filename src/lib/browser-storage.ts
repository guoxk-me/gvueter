export type BrowserStorageArea = 'local' | 'session'

export type StorageReader = Pick<Storage, 'getItem'>
export type StorageWriter = Pick<Storage, 'setItem'>
export type StorageRemover = Pick<Storage, 'removeItem'>
export type StorageDiscarder = StorageWriter & StorageRemover

export function getBrowserStorage(area: BrowserStorageArea): Storage | undefined {
  if (typeof window === 'undefined')
    return undefined

  try {
    // AI modified: privacy policies may throw before a Web Storage method can even be called.
    return area === 'local' ? window.localStorage : window.sessionStorage
  }
  catch {
    return undefined
  }
}

export function safeStorageGet(storage: StorageReader | undefined, key: string): string | null {
  if (!storage)
    return null

  try {
    return storage.getItem(key)
  }
  catch {
    return null
  }
}

export function safeStorageSet(
  storage: StorageWriter | undefined,
  key: string,
  storedValue: string,
): boolean {
  if (!storage)
    return false

  try {
    storage.setItem(key, storedValue)
    return true
  }
  catch {
    return false
  }
}

export function safeStorageRemove(storage: StorageRemover | undefined, key: string): boolean {
  if (!storage)
    return false

  try {
    storage.removeItem(key)
    return true
  }
  catch {
    return false
  }
}

export function safeStorageDiscard(storage: StorageDiscarder | undefined, key: string): boolean {
  if (safeStorageRemove(storage, key))
    return true

  // AI modified: an empty tombstone prevents a readable stale value when removal alone is blocked.
  return safeStorageSet(storage, key, '')
}
