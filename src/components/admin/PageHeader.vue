<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>()

defineSlots<{
  actions?: () => unknown
  default?: () => unknown
}>()
</script>

<template>
  <!-- AI modified: title content can shrink and actions wrap instead of colliding under long translations. -->
  <header
    class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    data-page-region="header"
  >
    <div class="min-w-0 flex-1 space-y-1" data-page-header-copy>
      <p v-if="eyebrow" class="break-words text-sm font-medium text-primary">
        {{ eyebrow }}
      </p>
      <h1 class="text-pretty break-words text-2xl font-semibold tracking-tight text-foreground">
        {{ title }}
      </h1>
      <p v-if="description" class="max-w-3xl break-words text-sm text-muted-foreground">
        {{ description }}
      </p>
      <slot />
    </div>
    <div
      v-if="$slots.actions"
      class="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end"
      data-page-header-actions
    >
      <slot name="actions" />
    </div>
  </header>
</template>
