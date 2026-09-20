<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { DictionarySelectionChange } from './business-components'
import type { DictionaryOption } from '@/features/dictionaries'
import { computed, toRef, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDictionaryOptions } from '@/features/dictionaries'
import StatusTag from './StatusTag.vue'

const props = withDefaults(
  defineProps<{
    code: string
    label?: string
    placeholder?: string
    disabled?: boolean
    options?: readonly DictionaryOption[]
    showStatus?: boolean
  }>(),
  {
    disabled: false,
    showStatus: true,
  },
)

const emit = defineEmits<{
  change: [selection: DictionarySelectionChange]
}>()

const selectedValue = defineModel<string | undefined>({ default: undefined })
const { t } = useI18n()
const remoteErrorId = useId()
// AI modified: caller-owned static options must not trigger an unrelated remote dictionary request.
const dictionaryOptions = useDictionaryOptions(
  toRef(props, 'code'),
  computed(() => props.options === undefined),
)
const availableOptions = computed(() => props.options ?? dictionaryOptions.options.value)
const selectorLabel = computed(
  () => props.label ?? props.placeholder ?? t('components.business.selectDictionaryValue'),
)
const isDisabled = computed(
  () =>
    props.disabled
    || (props.options === undefined
      && (dictionaryOptions.isLoading.value || Boolean(dictionaryOptions.error.value))),
)

function selectOption(nextValue: AcceptableValue): void {
  if (typeof nextValue !== 'string')
    return

  const selectedOption = availableOptions.value.find(option => option.value === nextValue)
  if (!selectedOption || selectedOption.isDisabled)
    return

  // AI modified: emit the selected dictionary metadata with the controlled value for status-aware forms.
  selectedValue.value = selectedOption.value
  emit('change', { option: selectedOption, value: selectedOption.value })
}
</script>

<template>
  <Select :model-value="selectedValue" :disabled="isDisabled" @update:model-value="selectOption">
    <!-- AI modified: dictionary selectors accept a business label so the trigger has a stable accessible name. -->
    <SelectTrigger
      class="w-full"
      :aria-label="selectorLabel"
      :aria-describedby="
        props.options === undefined && dictionaryOptions.error.value ? remoteErrorId : undefined
      "
    >
      <SelectValue
        :placeholder="
          props.options === undefined && dictionaryOptions.isLoading.value
            ? t('common.loading')
            : (placeholder ?? t('components.business.selectDictionaryValue'))
        "
      />
    </SelectTrigger>
    <SelectContent>
      <SelectItem
        v-for="option in availableOptions"
        :key="option.value"
        :value="option.value"
        :disabled="option.isDisabled"
      >
        <StatusTag v-if="showStatus" :label="option.label" :tone="option.color" />
        <span v-else>{{ option.label }}</span>
      </SelectItem>
      <SelectItem v-if="availableOptions.length === 0" value="__empty__" disabled>
        {{ t('common.noData') }}
      </SelectItem>
    </SelectContent>
  </Select>
  <div
    v-if="props.options === undefined && dictionaryOptions.error.value"
    :id="remoteErrorId"
    class="mt-2 flex flex-wrap items-center gap-2 text-xs text-destructive"
    role="alert"
  >
    <span>{{ t('common.unableToLoad') }}</span>
    <!-- AI modified: remote dictionary failures stay visible and recoverable in the owning field. -->
    <Button type="button" size="sm" variant="outline" @click="dictionaryOptions.refresh()">
      {{ t('common.retry') }}
    </Button>
  </div>
</template>
