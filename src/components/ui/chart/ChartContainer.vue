<script lang="ts">
import type { HTMLAttributes } from 'vue'
import type { ChartConfig } from '.'
import { useId } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, toRefs, useTemplateRef } from 'vue'
import { cn } from '@/lib/utils'
import { provideChartContext } from '.'
import ChartStyle from './ChartStyle.vue'
</script>

<script setup lang="ts">
const props = defineProps<{
  id?: HTMLAttributes['id']
  class?: HTMLAttributes['class']
  config: ChartConfig
  cursor?: boolean
}>()

defineSlots<{
  default: {
    id: string
    config: ChartConfig
    revision: number
  }
}>()

const { config } = toRefs(props)
const uniqueId = useId()

// AI modified: encode caller-provided ids before they are interpolated into chart CSS selectors.
function getSafeChartIdSegment(source: string): string {
  return Array.from(source, (character) => {
    if (/^[\w-]$/.test(character))
      return character

    const codePoint = character.codePointAt(0)
    return codePoint === undefined ? '-' : `-${codePoint.toString(16)}-`
  }).join('')
}

const chartId = computed(() => `chart-${getSafeChartIdSegment(props.id || uniqueId)}`)
const containerRef = useTemplateRef<HTMLElement>('container')
const revision = shallowRef(0)

interface ChartBounds {
  height: number
  width: number
}

let committedBounds: ChartBounds | undefined
let pendingBounds: ChartBounds | undefined
let resizeFrame: number | undefined
let resizeObserver: ResizeObserver | undefined

function hasSameBounds(first: ChartBounds | undefined, second: ChartBounds): boolean {
  return first?.width === second.width && first.height === second.height
}

onMounted(() => {
  const container = containerRef.value
  if (!container || typeof ResizeObserver === 'undefined')
    return

  // AI modified: remount size-sensitive chart children only after a distinct visible resize.
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry)
      return

    const nextBounds = {
      height: entry.contentRect.height,
      width: entry.contentRect.width,
    }
    if (nextBounds.width <= 0 || nextBounds.height <= 0)
      return
    if (hasSameBounds(pendingBounds, nextBounds))
      return
    if (!pendingBounds && hasSameBounds(committedBounds, nextBounds))
      return

    pendingBounds = nextBounds
    if (resizeFrame !== undefined)
      return

    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = undefined
      const latestBounds = pendingBounds
      pendingBounds = undefined
      if (!latestBounds || hasSameBounds(committedBounds, latestBounds))
        return

      committedBounds = latestBounds
      revision.value += 1
    })
  })
  resizeObserver.observe(container)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = undefined

  if (resizeFrame !== undefined) {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = undefined
  }
  pendingBounds = undefined
})

provideChartContext({
  id: uniqueId,
  config,
})
</script>

<template>
  <div
    ref="container"
    data-slot="chart"
    :data-chart="chartId"
    :class="
      cn(
        `[&_.tick_text]:!fill-muted-foreground [&_.tick_line]:!stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex min-w-0 flex-col aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden [&_[data-vis-xy-container]]:h-full [&_[data-vis-single-container]]:h-full h-full [&_[data-vis-xy-container]]:w-full [&_[data-vis-single-container]]:w-full w-full `,
        props.class,
      )
    "
    :style="{
      '--vis-tooltip-padding': '0px',
      '--vis-tooltip-background-color': 'transparent',
      '--vis-tooltip-border-color': 'transparent',
      '--vis-tooltip-text-color': 'none',
      '--vis-tooltip-shadow-color': 'none',
      '--vis-tooltip-backdrop-filter': 'none',
      '--vis-crosshair-circle-stroke-color': '#0000',
      '--vis-crosshair-line-stroke-width': cursor ? '1px' : '0px',
      '--vis-font-family': 'var(--font-sans)',
    }"
  >
    <slot :id="uniqueId" :config="config" :revision="revision" />
    <ChartStyle :id="chartId" />
  </div>
</template>
