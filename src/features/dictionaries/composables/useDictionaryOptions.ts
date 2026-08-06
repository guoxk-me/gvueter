import type { MaybeRefOrGetter } from 'vue'
import type { DictionaryOptionResponse } from '@/features/dictionaries/types'
import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, watch } from 'vue'
import { DICTIONARY_OPTION_RESPONSE_SCHEMA } from '@/features/dictionaries/dictionary-api-contracts'
import { get } from '@/lib/http'
import { useDictionaryStore } from '@/stores/dictionary'

export function useDictionaryOptions(
  code: MaybeRefOrGetter<string>,
  isEnabled: MaybeRefOrGetter<boolean> = true,
) {
  const dictionaryStore = useDictionaryStore()
  const dictionaryCode = computed(() => toValue(code))
  const optionsQuery = useQuery({
    queryKey: computed(() => ['dictionary-options', dictionaryCode.value]),
    queryFn: () =>
      get<DictionaryOptionResponse>(
        `/dictionaries/options/${encodeURIComponent(dictionaryCode.value)}`,
        undefined,
        { responseSchema: DICTIONARY_OPTION_RESPONSE_SCHEMA },
      ),
    enabled: computed(() => toValue(isEnabled) && Boolean(dictionaryCode.value)),
    initialData: () => {
      // AI modified: hydrate each query once from persisted cache without mutating inside a computed getter.
      const options = dictionaryStore.getOptions(dictionaryCode.value)
      return options ? { code: dictionaryCode.value, options } : undefined
    },
    staleTime: 5 * 60 * 1000,
  })

  watch(
    () => optionsQuery.data.value,
    (dictionaryResponse) => {
      if (dictionaryResponse)
        dictionaryStore.cacheOptions(dictionaryResponse.code, dictionaryResponse.options)
    },
    { immediate: true },
  )

  return {
    options: computed(() => optionsQuery.data.value?.options ?? []),
    isLoading: optionsQuery.isPending,
    error: optionsQuery.error,
    refresh: optionsQuery.refetch,
  }
}
