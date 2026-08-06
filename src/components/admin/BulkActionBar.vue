<script setup lang="ts">
import { X } from '@lucide/vue'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    selectedCount: number
    selectionLabel?: string
    clearLabel?: string
  }>(),
  {
    selectionLabel: 'selected',
    clearLabel: 'Clear selection',
  },
)

const emit = defineEmits<{
  clear: []
}>()

defineSlots<{
  default?: () => unknown
}>()
</script>

<template>
  <div
    v-if="props.selectedCount > 0"
    class="flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between"
    role="status"
  >
    <p class="text-sm font-medium text-foreground">
      {{ props.selectedCount }} {{ props.selectionLabel }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <slot />
      <Button type="button" variant="ghost" size="sm" @click="emit('clear')">
        <X class="mr-1.5 size-4" aria-hidden="true" />
        {{ props.clearLabel }}
      </Button>
    </div>
  </div>
</template>
