<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    label?: string
    showValue?: boolean
    tone?: 'default' | 'success' | 'warning' | 'destructive'
    class?: HTMLAttributes['class']
  }>(),
  {
    max: 100,
    label: '',
    showValue: true,
    tone: 'default',
  },
)

const percentage = computed(() => {
  if (props.max <= 0) return 0
  return Math.min(Math.max((props.value / props.max) * 100, 0), 100)
})
const indicatorClass = computed(
  () =>
    ({
      default: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    })[props.tone],
)
</script>

<template>
  <div :class="cn('space-y-1.5', props.class)">
    <div v-if="label || showValue" class="flex items-center justify-between gap-3 text-sm">
      <span v-if="label" class="font-medium">{{ label }}</span>
      <span v-if="showValue" class="text-muted-foreground">{{ Math.round(percentage) }}%</span>
    </div>
    <div
      class="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      :aria-label="label || undefined"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="Math.min(Math.max(value, 0), max)"
    >
      <div
        class="h-full rounded-full transition-[width] duration-300"
        :class="indicatorClass"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>
