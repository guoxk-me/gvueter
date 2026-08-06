<script setup lang="ts">
import type { Component } from 'vue'
import type { CalloutTone } from './callout'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from '@lucide/vue'
import { computed } from 'vue'
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
const toneConfig = computed(
  () =>
    ({
      info: { icon: Info, class: 'border-primary/30 bg-primary/5 text-foreground', role: 'status' },
      success: {
        icon: CircleCheck,
        class: 'border-success/30 bg-success/10 text-foreground',
        role: 'status',
      },
      warning: {
        icon: TriangleAlert,
        class: 'border-warning/35 bg-warning/10 text-foreground',
        role: 'alert',
      },
      error: {
        icon: CircleAlert,
        class: 'border-destructive/35 bg-destructive/10 text-foreground',
        role: 'alert',
      },
    })[props.tone] as { icon: Component; class: string; role: 'alert' | 'status' },
)
</script>

<template>
  <div
    v-if="isVisible"
    class="flex gap-3 rounded-lg border p-3"
    :class="toneConfig.class"
    :role="toneConfig.role"
  >
    <component :is="toneConfig.icon" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1 space-y-1">
      <p class="text-sm font-medium">
        {{ title }}
      </p>
      <p v-if="description" class="text-sm text-muted-foreground">
        {{ description }}
      </p>
      <div v-if="$slots.default" class="text-sm text-muted-foreground">
        <slot />
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2 pt-1">
        <slot name="actions" />
      </div>
    </div>
    <Button
      v-if="dismissible"
      type="button"
      variant="ghost"
      size="icon-sm"
      class="-mt-1 -mr-1 shrink-0"
      :aria-label="closeLabel"
      @click="isVisible = false"
    >
      <X class="size-4" aria-hidden="true" />
    </Button>
  </div>
</template>
