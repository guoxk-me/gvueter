<script setup lang="ts">
import type { NavigationMenuNode } from '@/features/navigation'
import { ChevronDown, ExternalLink, MoreHorizontal } from '@lucide/vue'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import AdminNavigation from './AdminNavigation.vue'

const props = withDefaults(
  defineProps<{
    nodes: NavigationMenuNode[]
    restorationReserve?: number
  }>(),
  {
    restorationReserve: 0,
  },
)

const emit = defineEmits<{
  nodeSelected: [node: NavigationMenuNode]
  overflowChange: [hasOverflow: boolean]
}>()

const route = useRoute()
const { locale, t } = useI18n()
const container = useTemplateRef<HTMLDivElement>('container')
const measurementRail = useTemplateRef<HTMLDivElement>('measurementRail')
const visibleCount = shallowRef(props.nodes.length)
const isMoreOpen = shallowRef(false)
const isUnmounted = shallowRef(false)

let resizeObserver: ResizeObserver | undefined
let measurementTimer: number | undefined
let hasWindowResizeFallback = false

const visibleNodes = computed(() => props.nodes.slice(0, visibleCount.value))
const overflowNodes = computed(() => props.nodes.slice(visibleCount.value))
const hasOverflow = computed(() => overflowNodes.value.length > 0)
const activeOverflowNode = computed(() =>
  overflowNodes.value.find(menuNode => branchContainsPath(menuNode, route.path)),
)
const moreButtonLabel = computed(() => {
  const activeNode = activeOverflowNode.value
  return activeNode
    ? t('nav.moreNavigationCurrent', { page: t(activeNode.titleKey) })
    : t('nav.moreNavigation')
})

function branchContainsPath(menuNode: NavigationMenuNode, path: string): boolean {
  return (
    (Boolean(menuNode.to) && (path === menuNode.to || path.startsWith(`${menuNode.to}/`)))
    || menuNode.children.some(childNode => branchContainsPath(childNode, path))
  )
}

function getMeasuredWidth(element: HTMLElement): number {
  return element.getBoundingClientRect().width || element.offsetWidth
}

function measureNavigation(): void {
  if (isUnmounted.value)
    return

  const navigationContainer = container.value
  const rail = measurementRail.value
  if (!navigationContainer || !rail)
    return

  const availableWidth = getMeasuredWidth(navigationContainer)
  if (availableWidth <= 0)
    return

  const menuMeasurements = [...rail.querySelectorAll<HTMLElement>('[data-top-navigation-measure]')]
  const moreMeasurement = rail.querySelector<HTMLElement>('[data-top-navigation-more-measure]')
  if (menuMeasurements.length !== props.nodes.length || !moreMeasurement)
    return

  const menuWidths = menuMeasurements.map(menuMeasurement => getMeasuredWidth(menuMeasurement))
  const measuredGap = Number.parseFloat(window.getComputedStyle(rail).columnGap)
  const navigationGap = Number.isFinite(measuredGap) ? measuredGap : 4
  const fullNavigationWidth
    = menuWidths.reduce((totalWidth, menuWidth) => totalWidth + menuWidth, 0)
      + Math.max(0, menuWidths.length - 1) * navigationGap
  const fullStateAvailableWidth = Math.max(0, availableWidth - props.restorationReserve)

  if (fullNavigationWidth <= fullStateAvailableWidth) {
    visibleCount.value = props.nodes.length
    return
  }

  const moreWidth = getMeasuredWidth(moreMeasurement)
  let occupiedWidth = 0
  let fittingCount = 0

  for (const menuWidth of menuWidths) {
    const candidateWidth = occupiedWidth + (fittingCount > 0 ? navigationGap : 0) + menuWidth
    const widthWithMore = candidateWidth + navigationGap + moreWidth
    if (widthWithMore > availableWidth)
      break
    occupiedWidth = candidateWidth
    fittingCount += 1
  }

  // AI modified: keep a contiguous leading set and move every remaining branch into one reachable menu.
  visibleCount.value = fittingCount
}

function scheduleMeasurement(): void {
  if (isUnmounted.value)
    return
  if (measurementTimer !== undefined)
    window.clearTimeout(measurementTimer)
  measurementTimer = window.setTimeout(() => {
    measurementTimer = undefined
    measureNavigation()
  })
}

function relayOverflowSelection(menuNode: NavigationMenuNode): void {
  if (menuNode.to || menuNode.href)
    isMoreOpen.value = false
  emit('nodeSelected', menuNode)
}

watch(
  [() => props.nodes, locale, () => props.restorationReserve],
  () => void nextTick(scheduleMeasurement),
  { deep: true, flush: 'post' },
)

watch(
  hasOverflow,
  (doesOverflow) => {
    if (!doesOverflow)
      isMoreOpen.value = false
    emit('overflowChange', doesOverflow)
  },
  { immediate: true },
)

onMounted(() => {
  void nextTick(() => {
    scheduleMeasurement()
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(scheduleMeasurement)
      if (container.value)
        resizeObserver.observe(container.value)
      if (measurementRail.value)
        resizeObserver.observe(measurementRail.value)
      return
    }

    // AI modified: older embedded browsers still recalculate navigation without ResizeObserver.
    window.addEventListener('resize', scheduleMeasurement)
    hasWindowResizeFallback = true
  })

  void document.fonts?.ready.then(scheduleMeasurement)
})

onBeforeUnmount(() => {
  isUnmounted.value = true
  resizeObserver?.disconnect()
  if (hasWindowResizeFallback)
    window.removeEventListener('resize', scheduleMeasurement)
  if (measurementTimer !== undefined)
    window.clearTimeout(measurementTimer)
})
</script>

<template>
  <div ref="container" class="relative min-w-0 overflow-hidden" data-top-navigation>
    <div class="flex min-w-0 items-center gap-1">
      <AdminNavigation
        v-if="visibleNodes.length"
        :nodes="visibleNodes"
        variant="horizontal"
        class="min-w-0"
        @node-selected="emit('nodeSelected', $event)"
      />

      <Popover v-if="hasOverflow" v-model:open="isMoreOpen">
        <PopoverTrigger as-child>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="h-9 shrink-0 gap-1.5 px-2.5 text-muted-foreground"
            :class="activeOverflowNode ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''"
            :aria-label="moreButtonLabel"
            :data-active="activeOverflowNode ? 'true' : undefined"
            data-top-navigation-more
          >
            <MoreHorizontal class="size-4" aria-hidden="true" />
            <span>{{ t('common.more') }}</span>
            <ChevronDown class="size-3.5" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          class="max-h-(--reka-popover-content-available-height) w-72 overflow-y-auto p-1.5"
          :aria-label="t('nav.moreNavigation')"
        >
          <AdminNavigation
            :nodes="overflowNodes"
            :aria-label="t('nav.moreNavigation')"
            @node-selected="relayOverflowSelection"
          />
        </PopoverContent>
      </Popover>
    </div>

    <div
      ref="measurementRail"
      aria-hidden="true"
      inert
      class="pointer-events-none absolute left-0 top-0 flex w-max items-center gap-1 invisible"
    >
      <span
        v-for="menuNode in nodes"
        :key="menuNode.id"
        class="inline-flex min-h-9 items-center whitespace-nowrap rounded-md px-2.5 text-sm font-medium"
        data-top-navigation-measure
      >
        <!-- AI modified: this hidden rail mirrors the text-first horizontal roots exactly. -->
        <span>{{ t(menuNode.titleKey) }}</span>
        <ChevronDown
          v-if="menuNode.children.length"
          class="ml-2 size-3.5 shrink-0"
          aria-hidden="true"
        />
        <ExternalLink v-else-if="menuNode.href" class="ml-2 size-3.5 shrink-0" aria-hidden="true" />
      </span>
      <span
        class="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm font-medium"
        data-top-navigation-more-measure
      >
        <MoreHorizontal class="size-4" aria-hidden="true" />
        <span>{{ t('common.more') }}</span>
        <ChevronDown class="size-3.5" aria-hidden="true" />
      </span>
    </div>
  </div>
</template>
