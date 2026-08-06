<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import { computed, useTemplateRef } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    id?: string
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
const inputRef = useTemplateRef<HTMLInputElement>('numberInput')
const safeStep = computed(() => (props.step > 0 ? props.step : 1))
const inputValue = computed(() => (value.value === null ? '' : String(value.value)))
const baseValue = computed(() => value.value ?? (Number.isFinite(props.min) ? props.min : 0))
const canDecrement = computed(() => !props.disabled && baseValue.value > props.min)
const canIncrement = computed(() => !props.disabled && baseValue.value < props.max)

function updateValue(event: Event): void {
  const rawValue = (event.target as HTMLInputElement).value
  if (!rawValue) {
    value.value = null
    return
  }

  const nextValue = Number(rawValue)
  value.value = Number.isFinite(nextValue) ? nextValue : null
}

function commitValue(): void {
  if (value.value !== null) value.value = keepWithinBounds(value.value)
}

function adjustValue(direction: 1 | -1): void {
  // AI modified: keep button-driven changes inside the same bounds enforced on blur.
  value.value = keepWithinBounds(baseValue.value + safeStep.value * direction)
  inputRef.value?.focus()
}

function keepWithinBounds(candidate: number): number {
  return Math.min(Math.max(candidate, props.min), props.max)
}
</script>

<template>
  <div
    :class="
      cn(
        'flex h-9 overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        props.class,
      )
    "
  >
    <!-- AI modified: every focus target exposes one visible ring around the composite number control. -->
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class="rounded-none border-r border-input"
      :aria-label="decrementLabel"
      :disabled="!canDecrement"
      @click="adjustValue(-1)"
    >
      <Minus class="size-4" aria-hidden="true" />
    </Button>
    <input
      :id="id"
      ref="numberInput"
      :value="inputValue"
      type="number"
      inputmode="decimal"
      class="min-w-0 flex-1 bg-transparent px-2 text-center text-sm outline-none disabled:cursor-not-allowed"
      :min="Number.isFinite(min) ? min : undefined"
      :max="Number.isFinite(max) ? max : undefined"
      :step="safeStep"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="updateValue"
      @blur="commitValue"
    />
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class="rounded-none border-l border-input"
      :aria-label="incrementLabel"
      :disabled="!canIncrement"
      @click="adjustValue(1)"
    >
      <Plus class="size-4" aria-hidden="true" />
    </Button>
  </div>
</template>
