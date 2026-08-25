<script setup lang="ts">
import type { ActivityTimelineEntry, ActivityTone } from './activity-timeline'
import { Circle } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  entries: readonly ActivityTimelineEntry[]
  emptyLabel?: string
}>()

defineSlots<{
  entry?: (props: { entry: ActivityTimelineEntry, index: number }) => unknown
}>()

const indicatorClass = computed<Record<ActivityTone, string>>(() => ({
  default: 'bg-muted text-muted-foreground',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}))
const { t } = useI18n()
const emptyLabel = computed(() => props.emptyLabel ?? t('components.defaults.noActivity'))

function getEntryTone(entry: ActivityTimelineEntry): string {
  return indicatorClass.value[entry.tone ?? 'default']
}
</script>

<template>
  <p v-if="props.entries.length === 0" class="text-sm text-muted-foreground">
    {{ emptyLabel }}
  </p>
  <ol v-else class="space-y-0">
    <li
      v-for="(entry, index) in props.entries"
      :key="entry.id"
      class="relative flex gap-3 pb-6 last:pb-0"
    >
      <span
        class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full"
        :class="getEntryTone(entry)"
      >
        <component :is="entry.icon" v-if="entry.icon" class="size-4" aria-hidden="true" />
        <Circle v-else class="size-3 fill-current" aria-hidden="true" />
      </span>
      <span
        v-if="index !== props.entries.length - 1"
        class="absolute top-8 left-4 h-[calc(100%-1rem)] border-l border-border"
      />
      <slot name="entry" :entry="entry" :index="index">
        <div class="min-w-0 flex-1 pt-1">
          <div
            class="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <p class="text-sm font-medium text-foreground">
              {{ entry.title }}
            </p>
            <time class="shrink-0 text-xs text-muted-foreground">{{ entry.occurredAt }}</time>
          </div>
          <p v-if="entry.description" class="mt-1 text-sm text-muted-foreground">
            {{ entry.description }}
          </p>
        </div>
      </slot>
    </li>
  </ol>
</template>
