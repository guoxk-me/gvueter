<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, useAttrs } from 'vue'
import {
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberField as UiNumberField,
} from '@/components/ui/number-field'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    name?: string
    min?: number
    max?: number
    step?: number
    placeholder?: string
    disabled?: boolean
    decrementLabel?: string
    incrementLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
    step: 1,
    placeholder: '',
    disabled: false,
    decrementLabel: 'Decrease value',
    incrementLabel: 'Increase value',
  },
)

const value = defineModel<number | null>({ default: null })
const safeStep = computed(() => (props.step > 0 ? props.step : 1))
const minValue = computed(() => (Number.isFinite(props.min) ? props.min : undefined))
const maxValue = computed(() => (Number.isFinite(props.max) ? props.max : undefined))
// AI modified: field-level ARIA attributes are forwarded to the shadcn number input, not its group.
const inputAttrs = useAttrs()

function updateValue(nextValue: number | undefined): void {
  value.value = nextValue ?? null
}
</script>

<template>
  <UiNumberField
    :id="id"
    :name="name"
    :model-value="value"
    :min="minValue"
    :max="maxValue"
    :step="safeStep"
    :disabled="disabled"
    :class="props.class"
    @update:model-value="updateValue"
  >
    <NumberFieldContent>
      <NumberFieldDecrement :aria-label="decrementLabel" />
      <NumberFieldInput v-bind="inputAttrs" :placeholder="placeholder" />
      <NumberFieldIncrement :aria-label="incrementLabel" />
    </NumberFieldContent>
  </UiNumberField>
</template>
