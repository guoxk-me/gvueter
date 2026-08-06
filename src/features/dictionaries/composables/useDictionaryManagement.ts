import type { Ref } from 'vue'
import type {
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryEntryListResponse,
  DictionaryType,
  DictionaryTypeInput,
  DictionaryTypeListResponse,
} from '@/features/dictionaries/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  DICTIONARY_ENTRY_LIST_RESPONSE_SCHEMA,
  DICTIONARY_ENTRY_SCHEMA,
  DICTIONARY_TYPE_LIST_RESPONSE_SCHEMA,
  DICTIONARY_TYPE_SCHEMA,
} from '@/features/dictionaries/dictionary-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, get, post, put } from '@/lib/http'
import { useDictionaryStore } from '@/stores/dictionary'

interface DictionaryTypeChangeRequest {
  dictionaryType?: DictionaryType
  input: DictionaryTypeInput
}

interface DictionaryEntryChangeRequest {
  dictionaryEntry?: DictionaryEntry
  input: DictionaryEntryInput
}

const dictionaryTypesQueryKey = ['dictionary-types'] as const
const dictionaryEntriesQueryKey = ['dictionary-entries'] as const

export function useDictionaryManagement(selectedDictionaryTypeId: Ref<string | undefined>) {
  const queryClient = useQueryClient()
  const dictionaryStore = useDictionaryStore()
  const dictionaryTypesQuery = useQuery({
    queryKey: dictionaryTypesQueryKey,
    queryFn: () =>
      get<DictionaryTypeListResponse>('/dictionaries/types', undefined, {
        responseSchema: DICTIONARY_TYPE_LIST_RESPONSE_SCHEMA,
      }),
  })
  const dictionaryEntriesQuery = useQuery({
    queryKey: computed(() => [...dictionaryEntriesQueryKey, selectedDictionaryTypeId.value]),
    queryFn: () =>
      selectedDictionaryTypeId.value
        ? get<DictionaryEntryListResponse>(
            `/dictionaries/types/${encodeURIComponent(selectedDictionaryTypeId.value)}/entries`,
            undefined,
            { responseSchema: DICTIONARY_ENTRY_LIST_RESPONSE_SCHEMA },
          )
        : Promise.resolve({ items: [] }),
    enabled: computed(() => Boolean(selectedDictionaryTypeId.value)),
  })

  function invalidateOptionCache(dictionaryCode?: string): void {
    if (!dictionaryCode) return
    dictionaryStore.invalidate(dictionaryCode)
    void queryClient.invalidateQueries({ queryKey: ['dictionary-options', dictionaryCode] })
  }

  const saveDictionaryTypeMutation = useMutation({
    mutationFn: ({ dictionaryType, input }: DictionaryTypeChangeRequest) =>
      dictionaryType
        ? put<DictionaryType>(`/dictionaries/types/${dictionaryType.id}`, input, {
            responseSchema: DICTIONARY_TYPE_SCHEMA,
          })
        : post<DictionaryType>('/dictionaries/types', input, {
            responseSchema: DICTIONARY_TYPE_SCHEMA,
          }),
    onSuccess: (savedDictionaryType, request) => {
      // AI modified: invalidate both the management list and old/new option cache keys after code changes.
      invalidateOptionCache(request.dictionaryType?.code)
      invalidateOptionCache(savedDictionaryType.code)
      void queryClient.invalidateQueries({ queryKey: dictionaryTypesQueryKey })
    },
  })
  const deleteDictionaryTypeMutation = useMutation({
    mutationFn: (dictionaryType: DictionaryType) =>
      del<null>(`/dictionaries/types/${dictionaryType.id}`, {
        responseSchema: EMPTY_RESPONSE_SCHEMA,
      }),
    onSuccess: (_response, dictionaryType) => {
      invalidateOptionCache(dictionaryType.code)
      void queryClient.invalidateQueries({ queryKey: dictionaryTypesQueryKey })
    },
  })
  const saveDictionaryEntryMutation = useMutation({
    mutationFn: ({ dictionaryEntry, input }: DictionaryEntryChangeRequest) => {
      if (dictionaryEntry)
        return put<DictionaryEntry>(`/dictionaries/entries/${dictionaryEntry.id}`, input, {
          responseSchema: DICTIONARY_ENTRY_SCHEMA,
        })
      if (!selectedDictionaryTypeId.value)
        throw new Error('A dictionary type must be selected before creating an entry')
      return post<DictionaryEntry>(
        `/dictionaries/types/${selectedDictionaryTypeId.value}/entries`,
        input,
        { responseSchema: DICTIONARY_ENTRY_SCHEMA },
      )
    },
    onSuccess: () => {
      const selectedDictionaryType = dictionaryTypesQuery.data.value?.items.find(
        (dictionaryType) => dictionaryType.id === selectedDictionaryTypeId.value,
      )
      invalidateOptionCache(selectedDictionaryType?.code)
      void queryClient.invalidateQueries({ queryKey: dictionaryEntriesQueryKey })
    },
  })
  const deleteDictionaryEntryMutation = useMutation({
    mutationFn: (dictionaryEntry: DictionaryEntry) =>
      del<null>(`/dictionaries/entries/${dictionaryEntry.id}`, {
        responseSchema: EMPTY_RESPONSE_SCHEMA,
      }),
    onSuccess: () => {
      const selectedDictionaryType = dictionaryTypesQuery.data.value?.items.find(
        (dictionaryType) => dictionaryType.id === selectedDictionaryTypeId.value,
      )
      invalidateOptionCache(selectedDictionaryType?.code)
      void queryClient.invalidateQueries({ queryKey: dictionaryEntriesQueryKey })
    },
  })

  return {
    dictionaryTypes: computed(() => dictionaryTypesQuery.data.value?.items ?? []),
    dictionaryEntries: computed(() => dictionaryEntriesQuery.data.value?.items ?? []),
    typesError: dictionaryTypesQuery.error,
    entriesError: dictionaryEntriesQuery.error,
    isLoadingTypes: dictionaryTypesQuery.isPending,
    isLoadingEntries: dictionaryEntriesQuery.isPending,
    isSavingType: saveDictionaryTypeMutation.isPending,
    isDeletingType: deleteDictionaryTypeMutation.isPending,
    isSavingEntry: saveDictionaryEntryMutation.isPending,
    isDeletingEntry: deleteDictionaryEntryMutation.isPending,
    saveDictionaryType: saveDictionaryTypeMutation.mutateAsync,
    deleteDictionaryType: deleteDictionaryTypeMutation.mutateAsync,
    saveDictionaryEntry: saveDictionaryEntryMutation.mutateAsync,
    deleteDictionaryEntry: deleteDictionaryEntryMutation.mutateAsync,
  }
}
