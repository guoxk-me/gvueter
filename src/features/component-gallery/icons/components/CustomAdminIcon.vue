<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    size?: number | string
    title?: string
  }>(),
  {
    size: 24,
    title: undefined,
  },
)

const titleId = `custom-admin-icon-${useId()}`
</script>

<template>
  <!-- AI modified: custom SVG stays local, uses currentColor, and exposes meaning only when a title is supplied. -->
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="title ? 'img' : undefined"
    :aria-labelledby="title ? titleId : undefined"
    :aria-hidden="title ? undefined : true"
  >
    <title v-if="title" :id="titleId">{{ title }}</title>
    <path d="M5 7.5 12 3l7 4.5v9L12 21l-7-4.5z" />
    <path d="m8.5 10 3.5 2 3.5-2M12 12v4.5" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
  </svg>
</template>
