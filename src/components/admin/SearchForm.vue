<script setup lang="ts" generic="TValues extends SearchFormValues">
import type { AcceptableValue } from 'reka-ui'
import type { SearchFormField, SearchFormFieldValue, SearchFormValues } from './search-form'
import { RotateCcw, Search } from '@lucide/vue'
import { useId } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = withDefaults(
  defineProps<{
    fields: readonly SearchFormField<TValues>[]
    defaultValues: TValues
    searchLabel: string
    resetLabel: string
    isSearching?: boolean
  }>(),
  {
    isSearching: false,
  },
)

const emit = defineEmits<{
  search: [values: TValues]
  reset: [values: TValues]
}>()

defineSlots<{
  actions?: () => unknown
}>()

const values = defineModel<TValues>({ required: true })
const searchFormId = useId()

function fieldInputId(fieldName: Extract<keyof TValues, string>): string {
  // AI modified: separate search forms keep unique label/control relationships for the same field names.
  return `search-${searchFormId}-${fieldName}`
}

function updateField(name: Extract<keyof TValues, string>, value: SearchFormFieldValue): void {
  // AI modified: replace the object so Vue Query keys react to an explicit search snapshot.
  values.value = { ...values.value, [name]: value }
}

function updateSelect(name: Extract<keyof TValues, string>, value: AcceptableValue): void {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint')
    updateField(name, String(value))
}

function getInputValue(name: Extract<keyof TValues, string>): number | string {
  const value = values.value[name]
  return typeof value === 'number' ? value : String(value ?? '')
}

function updateInput(field: SearchFormField<TValues>, value: number | string): void {
  if (field.type === 'number') {
    updateField(field.name, value === '' ? undefined : Number(value))
    return
  }
  updateField(field.name, value)
}

function submitSearch(): void {
  emit('search', { ...values.value })
}

function resetSearch(): void {
  values.value = { ...props.defaultValues }
  emit('reset', { ...values.value })
}
</script>

<template>
  <form
    class="rounded-lg border border-border bg-card p-4"
    role="search"
    @submit.prevent="submitSearch"
  >
    <!-- AI modified: each query field remains shrinkable when labels expand or the grid drops columns. -->
    <div class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="field in fields" :key="field.name" class="grid min-w-0 gap-1.5">
        <Label :for="fieldInputId(field.name)" class="break-words">{{ field.label }}</Label>
        <Select
          v-if="field.type === 'select'"
          :model-value="String(values[field.name] ?? '')"
          @update:model-value="updateSelect(field.name, $event)"
        >
          <SelectTrigger :id="fieldInputId(field.name)" class="min-w-0" :aria-label="field.label">
            <SelectValue :placeholder="field.placeholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in field.options ?? []"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          v-else
          :id="fieldInputId(field.name)"
          :type="field.type === 'search' ? 'search' : field.type"
          :inputmode="field.inputMode"
          :model-value="getInputValue(field.name)"
          :placeholder="field.placeholder"
          @update:model-value="updateInput(field, $event)"
        />
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
      <slot name="actions" />
      <Button type="button" variant="outline" :disabled="isSearching" @click="resetSearch">
        <RotateCcw class="mr-2 size-4" aria-hidden="true" />
        {{ resetLabel }}
      </Button>
      <Button type="submit" :disabled="isSearching">
        <Search class="mr-2 size-4" aria-hidden="true" />
        {{ searchLabel }}
      </Button>
    </div>
  </form>
</template>
