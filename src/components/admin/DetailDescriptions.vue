<script setup lang="ts">
import type { DetailDescriptionItem } from './business-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CopyButton from './CopyButton.vue'
import StatusTag from './StatusTag.vue'

const props = withDefaults(
  defineProps<{
    items: readonly DetailDescriptionItem[]
    columns?: 1 | 2 | 3
    emptyText?: string
    bordered?: boolean
  }>(),
  {
    columns: 2,
    emptyText: '—',
    bordered: true,
  },
)

defineSlots<{
  value?: (props: { item: DetailDescriptionItem, value: string }) => unknown
}>()

const { t } = useI18n()
const gridClass = computed(
  () =>
    ({
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    })[props.columns],
)

function descriptionValue(item: DetailDescriptionItem): string {
  if (item.value === null || item.value === undefined || item.value === '')
    return props.emptyText
  return String(item.value)
}

function itemSpanClass(item: DetailDescriptionItem): string {
  const availableSpan = Math.min(item.span ?? 1, props.columns)
  if (availableSpan === 3)
    return 'md:col-span-2 xl:col-span-3'
  if (availableSpan === 2)
    return 'md:col-span-2'
  return ''
}
</script>

<template>
  <dl
    class="grid overflow-hidden"
    :class="[gridClass, bordered ? 'rounded-lg border' : 'gap-x-6 gap-y-4']"
  >
    <div
      v-for="item in items"
      :key="item.key"
      class="min-w-0 space-y-1.5 p-4"
      :class="[
        itemSpanClass(item),
        bordered ? 'border-b border-border last:border-b-0 md:border-r md:even:border-r-0' : '',
      ]"
    >
      <dt class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {{ item.label }}
      </dt>
      <dd class="flex min-h-7 min-w-0 items-center gap-2 text-sm text-foreground">
        <slot name="value" :item="item" :value="descriptionValue(item)">
          <StatusTag
            v-if="item.tone && descriptionValue(item) !== emptyText"
            :label="descriptionValue(item)"
            :tone="item.tone"
          />
          <span v-else class="min-w-0 break-words">
            {{ descriptionValue(item) }}
          </span>
          <CopyButton
            v-if="item.copyable && descriptionValue(item) !== emptyText"
            :value="descriptionValue(item)"
            :label="t('components.business.copyValue', { label: item.label })"
            :copied-label="t('common.copied')"
            icon-only
          />
        </slot>
      </dd>
    </div>
  </dl>
</template>
