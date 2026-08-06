<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  text?: string
}>()
const { t } = useI18n()
const watermarkText = computed(() => props.text ?? t('common.appTitle'))
// AI modified: only the default brand watermark opts out of translation; caller-provided prose stays translatable.
const shouldPreserveWatermarkText = computed(() => props.text === undefined)

const watermarkCells = Array.from({ length: 24 }, (_, cellIndex) => cellIndex)
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 z-20 grid grid-cols-3 overflow-hidden opacity-[0.055]"
    aria-hidden="true"
    data-admin-watermark
    :translate="shouldPreserveWatermarkText ? 'no' : undefined"
  >
    <span
      v-for="cellIndex in watermarkCells"
      :key="cellIndex"
      class="flex min-h-28 -rotate-[24deg] items-center justify-center whitespace-nowrap text-sm font-semibold tracking-wider text-foreground"
    >
      {{ watermarkText }}
    </span>
  </div>
</template>
