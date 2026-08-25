import type { DictionaryOption } from '@/features/dictionaries/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const DICTIONARY_CACHE_LIFETIME_MS = 5 * 60 * 1000

export interface DictionaryCacheEntry {
  expiresAt: number
  options: DictionaryOption[]
}

export function isDictionaryCacheFresh(
  cacheEntry: DictionaryCacheEntry | undefined,
  referenceTime = Date.now(),
): boolean {
  return Boolean(cacheEntry && cacheEntry.expiresAt > referenceTime)
}

export const useDictionaryStore = defineStore(
  'dictionary',
  () => {
    const optionsByCode = ref<Record<string, DictionaryCacheEntry>>({})

    function getOptions(code: string): DictionaryOption[] | undefined {
      const cacheEntry = optionsByCode.value[code]
      if (!cacheEntry || !isDictionaryCacheFresh(cacheEntry)) {
        // AI modified: prune stale persisted records when a consumer explicitly reads that code.
        delete optionsByCode.value[code]
        return undefined
      }
      return cacheEntry.options.map(option => ({ ...option }))
    }

    function cacheOptions(code: string, options: DictionaryOption[]): void {
      // AI modified: persist only the stable option contract; management records remain in Vue Query.
      optionsByCode.value[code] = {
        expiresAt: Date.now() + DICTIONARY_CACHE_LIFETIME_MS,
        options: options.map(option => ({ ...option })),
      }
    }

    function invalidate(code?: string): void {
      if (code) {
        delete optionsByCode.value[code]
        return
      }
      optionsByCode.value = {}
    }

    return { optionsByCode, getOptions, cacheOptions, invalidate }
  },
  {
    persist: {
      key: 'admin-dictionary-cache',
      pick: ['optionsByCode'],
    },
  },
)
