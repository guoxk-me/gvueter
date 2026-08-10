<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { computed } from 'vue'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@/lib/utils'

const props = defineProps<ToasterProps>()

// AI modified: keep long toast identifiers inside the viewport without overriding caller styles.
const toastOptions = computed<ToasterProps['toastOptions']>(() => ({
  ...props.toastOptions,
  style: {
    overflowWrap: 'anywhere',
    ...props.toastOptions?.style,
  },
}))
</script>

<template>
  <!-- AI modified: toast copy can wrap at arbitrary identifiers and decorative icons stay silent. -->
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="props"
    :toast-options="toastOptions"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" aria-hidden="true" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" aria-hidden="true" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" aria-hidden="true" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" aria-hidden="true" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" aria-hidden="true" />
    </template>
  </Sonner>
</template>
