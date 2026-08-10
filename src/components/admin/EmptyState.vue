<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from '@lucide/vue'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

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
  <!-- AI modified: the business empty-state API now delegates composition and spacing to shadcn Empty primitives. -->
  <Empty class="min-h-48 flex-none border border-border bg-muted/20">
    <EmptyHeader>
      <slot name="icon">
        <EmptyMedia variant="icon">
          <component :is="icon" aria-hidden="true" />
        </EmptyMedia>
      </slot>
      <EmptyTitle class="max-w-full text-sm font-semibold text-foreground">
        <h2 class="max-w-full break-words">
          {{ title }}
        </h2>
      </EmptyTitle>
      <EmptyDescription v-if="description">
        <span class="block max-w-full break-words">{{ description }}</span>
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent v-if="$slots.actions" class="flex-row flex-wrap justify-center gap-2">
      <slot name="actions" />
    </EmptyContent>
  </Empty>
</template>
