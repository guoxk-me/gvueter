import type {
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryOptionResponse,
  DictionaryType,
  DictionaryTypeInput,
  DictionaryTypeListResponse,
} from '@/features/dictionaries/types'
import type { DictionaryCacheEntry } from '@/stores/dictionary'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getSelectedDictionaryTypeId } from '@/features/dictionaries/dictionary-selection'
import { del, get, post, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockDictionaries } from '@/mocks/handlers/dictionaries'
import { isDictionaryCacheFresh, useDictionaryStore } from '@/stores/dictionary'

const newDictionaryType: DictionaryTypeInput = {
  code: 'ticket_priority',
  name: 'Ticket priority',
  description: 'Support ticket priority labels.',
  status: 'active',
}

const newDictionaryEntry: DictionaryEntryInput = {
  label: 'Critical',
  value: 'critical',
  color: 'destructive',
  order: 5,
  status: 'active',
}

describe('dictionary management API', () => {
  beforeEach(() => {
    resetMockDictionaries()
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  })

  it('creates a type and performs entry CRUD through the master-detail contract', async () => {
    const createdType = await post<DictionaryType>('/dictionaries/types', newDictionaryType)
    expect(createdType).toMatchObject(newDictionaryType)

    const createdEntry = await post<DictionaryEntry>(
      `/dictionaries/types/${createdType.id}/entries`,
      newDictionaryEntry,
    )
    expect(createdEntry).toMatchObject(newDictionaryEntry)

    const updatedEntry = await put<DictionaryEntry>(`/dictionaries/entries/${createdEntry.id}`, {
      ...newDictionaryEntry,
      label: 'Urgent',
      status: 'disabled',
    })
    expect(updatedEntry).toMatchObject({ label: 'Urgent', status: 'disabled' })

    await del(`/dictionaries/entries/${createdEntry.id}`)
    await del(`/dictionaries/types/${createdType.id}`)
    const dictionaryTypes = await get<DictionaryTypeListResponse>('/dictionaries/types')
    expect(
      dictionaryTypes.items.some(dictionaryType => dictionaryType.id === createdType.id),
    ).toBe(false)
  })

  it('rejects duplicate type codes and values within one type', async () => {
    await expect(
      post('/dictionaries/types', {
        ...newDictionaryType,
        code: 'account_status',
      }),
    ).rejects.toMatchObject({ code: 'DICTIONARY_CODE_EXISTS', status: 409 })

    await expect(
      post('/dictionaries/types/account-status/entries', {
        ...newDictionaryEntry,
        value: 'active',
      }),
    ).rejects.toMatchObject({ code: 'DICTIONARY_VALUE_EXISTS', status: 409 })
  })

  it('rejects non-admin management reads and writes at the API boundary', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    // AI modified: dictionary management requires Settings read permission; option lookup stays shared.
    await expect(get<DictionaryTypeListResponse>('/dictionaries/types')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(post('/dictionaries/types', newDictionaryType)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('projects ordered options without exposing management identifiers', async () => {
    await put('/dictionaries/entries/account-suspended', {
      label: 'Suspended',
      value: 'suspended',
      color: 'destructive',
      order: 20,
      status: 'disabled',
    } satisfies DictionaryEntryInput)

    const response = await get<DictionaryOptionResponse>('/dictionaries/options/account_status')
    expect(response).toEqual({
      code: 'account_status',
      options: [
        { label: 'Active', value: 'active', color: 'success', isDisabled: false },
        { label: 'Suspended', value: 'suspended', color: 'destructive', isDisabled: true },
        { label: 'Locked', value: 'locked', color: 'warning', isDisabled: false },
        { label: 'Pending review', value: 'pending', color: 'primary', isDisabled: false },
      ],
    })
    expect(response.options[0]).not.toHaveProperty('id')
    expect(response.options[0]).not.toHaveProperty('typeId')
  })
})

describe('dictionary option cache and workspace selection', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('uses strict expiry checks and returns defensive option copies', () => {
    const freshCacheEntry: DictionaryCacheEntry = {
      expiresAt: 1_001,
      options: [{ label: 'Active', value: 'active', color: 'success', isDisabled: false }],
    }
    expect(isDictionaryCacheFresh(freshCacheEntry, 1_000)).toBe(true)
    expect(isDictionaryCacheFresh(freshCacheEntry, 1_001)).toBe(false)

    const dictionaryStore = useDictionaryStore()
    dictionaryStore.cacheOptions('account_status', freshCacheEntry.options)
    const firstRead = dictionaryStore.getOptions('account_status')
    firstRead?.push({ label: 'Injected', value: 'injected', color: 'warning', isDisabled: false })
    expect(dictionaryStore.getOptions('account_status')).toHaveLength(1)
  })

  it('preserves a valid master selection and falls back after deletion', () => {
    const dictionaryTypes: DictionaryType[] = [
      {
        id: 'first',
        code: 'first_type',
        name: 'First',
        description: '',
        status: 'active',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
      {
        id: 'second',
        code: 'second_type',
        name: 'Second',
        description: '',
        status: 'active',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    ]

    expect(getSelectedDictionaryTypeId(dictionaryTypes, 'second')).toBe('second')
    expect(getSelectedDictionaryTypeId(dictionaryTypes, 'deleted')).toBe('first')
    expect(getSelectedDictionaryTypeId([], 'first')).toBeUndefined()
  })
})
