<script setup lang="ts">
import type { Component } from 'vue'
import type { CalloutTone } from './callout'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from '@lucide/vue'
import { computed } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    tone?: CalloutTone
    dismissible?: boolean
    closeLabel?: string
  }>(),
  {
    description: '',
    tone: 'info',
    dismissible: false,
    closeLabel: 'Dismiss alert',
  },
)

defineSlots<{
  default?: () => unknown
  actions?: () => unknown
}>()

// AI modified: visibility remains controlled so callers can restore a dismissed notice after relevant state changes.
const isVisible = defineModel<boolean>('visible', { default: true })
// AI modified: business tones now map to shadcn Alert variants while preserving their announcement priority.
const toneConfig = computed(
  () =>
    ({
      info: {
        icon: Info,
        class: 'border-primary/30 bg-primary/5',
        role: 'status',
        variant: 'default',
      },
      success: {
        icon: CircleCheck,
        class: 'border-success/30 bg-success/10',
        role: 'status',
        variant: 'default',
      },
      warning: {
        icon: TriangleAlert,
        class: 'border-warning/35 bg-warning/10',
        role: 'alert',
        variant: 'default',
      },
      error: {
        icon: CircleAlert,
        class: 'border-destructive/35 bg-destructive/10',
        role: 'alert',
        variant: 'destructive',
      },
    })[props.tone] as {
      icon: Component
      class: string
      role: 'alert' | 'status'
      variant: 'default' | 'destructive'
    },
)
</script>

<template>
  <Alert
    v-if="isVisible"
    :variant="toneConfig.variant"
    :class="[toneConfig.class, { 'pr-12': dismissible }]"
    :role="toneConfig.role"
  >
    <component :is="toneConfig.icon" aria-hidden="true" />
    <AlertTitle class="min-w-0 line-clamp-none break-words">
      {{ title }}
    </AlertTitle>
    <AlertDescription
      v-if="description || $slots.default || $slots.actions"
      class="flex min-w-0 flex-col gap-1 break-words"
    >
      <p v-if="description">
        {{ description }}
      </p>
      <div v-if="$slots.default">
        <slot />
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2 pt-1">
        <slot name="actions" />
      </div>
    </AlertDescription>
    <Button
      v-if="dismissible"
      type="button"
      variant="ghost"
      size="icon-sm"
      class="absolute top-2 right-2"
      :aria-label="closeLabel"
      @click="isVisible = false"
    >
      <X data-icon="inline-start" aria-hidden="true" />
    </Button>
  </Alert>
</template>
