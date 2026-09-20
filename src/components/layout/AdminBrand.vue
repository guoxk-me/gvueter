<script setup lang="ts">
import { Layers3 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    showLabel?: boolean
  }>(),
  {
    showLabel: true,
  },
)

const { t } = useI18n()
</script>

<template>
  <RouterLink
    to="/dashboard"
    class="flex min-w-0 shrink-0 items-center gap-2.5 font-semibold text-foreground outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
    :aria-label="t('common.appTitle')"
    translate="no"
  >
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs"
      aria-hidden="true"
    >
      <Layers3 class="size-4.5" stroke-width="2" />
    </span>
    <span v-if="showLabel" class="hidden truncate text-[15px] tracking-[-0.01em] sm:inline">
      {{ t('common.appTitle') }}
    </span>
  </RouterLink>
</template>
