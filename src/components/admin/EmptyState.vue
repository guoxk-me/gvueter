<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from '@lucide/vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: Component
  }>(),
  {
    icon: () => Inbox,
  },
)

defineSlots<{
  icon?: () => unknown
  actions?: () => unknown
}>()
</script>

<template>
  <!-- AI modified: empty-state copy and actions wrap without widening their consumer page. -->
  <section
    class="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center"
  >
    <slot name="icon">
      <div
        class="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <component :is="icon" class="size-5" aria-hidden="true" />
      </div>
    </slot>
    <h2 class="max-w-full break-words text-sm font-semibold text-foreground">
      {{ title }}
    </h2>
    <p v-if="description" class="mt-1 max-w-md break-words text-sm text-muted-foreground">
      {{ description }}
    </p>
    <div
      v-if="$slots.actions"
      class="mt-4 flex min-w-0 flex-wrap items-center justify-center gap-2"
    >
      <slot name="actions" />
    </div>
  </section>
</template>
