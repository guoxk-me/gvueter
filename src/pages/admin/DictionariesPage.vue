<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useAllowedUrlState } from '@/composables/use-allowed-url-state'
import DictionaryWorkspace from '@/features/dictionaries/components/DictionaryWorkspace.vue'

defineOptions({ name: 'DictionariesPage' })

const allowedDictionaryTypeIds = shallowRef<readonly string[]>([])
const isDictionaryTypeStateReady = shallowRef(false)
const dictionaryTypeState = useAllowedUrlState({
  kind: 'string',
  queryKey: 'dictionaryType',
  allowedStates: allowedDictionaryTypeIds,
  defaultState: '',
  isReady: isDictionaryTypeStateReady,
  history: 'push',
})
const selectedDictionaryTypeId = computed<string | undefined>({
  get: () => dictionaryTypeState.value || allowedDictionaryTypeIds.value[0],
  set: (dictionaryTypeId) => {
    // AI modified: the first server-ordered category is the URL default while non-default choices remain shareable.
    dictionaryTypeState.value
      = dictionaryTypeId === allowedDictionaryTypeIds.value[0] ? '' : (dictionaryTypeId ?? '')
  },
})

function acceptDictionaryTypeOptions(dictionaryTypeIds: readonly string[]): void {
  // AI modified: dictionary category links accept only identifiers returned by the current server snapshot.
  allowedDictionaryTypeIds.value = [...dictionaryTypeIds]
  isDictionaryTypeStateReady.value = true
}
</script>

<template>
  <DictionaryWorkspace
    v-model:selected-dictionary-type-id="selectedDictionaryTypeId"
    @dictionary-type-options-ready="acceptDictionaryTypeOptions"
  />
</template>
