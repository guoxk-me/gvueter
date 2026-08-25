<script setup lang="ts">
import type { NavigationTab } from '@/stores/tabs'
import { LockKeyhole, X } from '@lucide/vue'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAppearanceStore } from '@/stores/appearance'
import { useTabsStore } from '@/stores/tabs'

const appearance = useAppearanceStore()
const tabsStore = useTabsStore()
const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const tabList = useTemplateRef<HTMLDivElement>('tabList')
const canScrollLeft = shallowRef(false)
const canScrollRight = shallowRef(false)
const overflowStatusId = `${useId()}-tabs-overflow-status`
const closeInstructionId = `${useId()}-tabs-close-instruction`

let resizeObserver: ResizeObserver | undefined
let hasWindowResizeFallback = false
let isUnmounted = false

const SCROLL_EDGE_TOLERANCE_PX = 1

const containerClass = computed(() => [
  'flex h-[var(--admin-context-tabs-height)] items-end gap-1 overflow-x-auto bg-transparent px-2 pt-1',
  appearance.tabStyle === 'minimal' ? 'items-center gap-3 px-4' : '',
  appearance.tabStyle === 'chrome' ? 'bg-muted/45' : '',
])
const fadeSurfaceClass = computed(() =>
  appearance.tabStyle === 'chrome' ? 'from-muted/95' : 'from-background',
)
const hasOverflow = computed(() => canScrollLeft.value || canScrollRight.value)
const overflowStatus = computed(() => {
  void locale.value
  if (canScrollLeft.value && canScrollRight.value)
    return t('nav.tabsOverflowBoth')
  if (canScrollLeft.value)
    return t('nav.tabsOverflowLeft')
  if (canScrollRight.value)
    return t('nav.tabsOverflowRight')
  return ''
})

function updateOverflowIndicators(): void {
  if (isUnmounted)
    return

  const currentTabList = tabList.value
  if (!currentTabList)
    return

  const maximumScrollLeft = Math.max(0, currentTabList.scrollWidth - currentTabList.clientWidth)
  const currentScrollLeft = Math.min(maximumScrollLeft, Math.max(0, currentTabList.scrollLeft))
  const isOverflowing = maximumScrollLeft > SCROLL_EDGE_TOLERANCE_PX

  // AI modified: real scroll geometry keeps long and translated tab labels discoverable at every zoom level.
  canScrollLeft.value = isOverflowing && currentScrollLeft > SCROLL_EDGE_TOLERANCE_PX
  canScrollRight.value
    = isOverflowing && maximumScrollLeft - currentScrollLeft > SCROLL_EDGE_TOLERANCE_PX
}

function observeTabGeometry(): void {
  if (!resizeObserver || !tabList.value)
    return

  resizeObserver.disconnect()
  resizeObserver.observe(tabList.value)
  for (const tabElement of tabList.value.querySelectorAll<HTMLElement>('[data-admin-tab]'))
    resizeObserver.observe(tabElement)
}

function refreshTabGeometry(): void {
  if (isUnmounted)
    return
  observeTabGeometry()
  updateOverflowIndicators()
}

function tabClass(tab: NavigationTab): string[] {
  const isActive = tabsStore.activeTabId === tab.id
  const commonClass
    = 'group flex h-8 shrink-0 items-center gap-1 whitespace-nowrap px-2 text-xs font-medium transition-colors'

  if (appearance.tabStyle === 'minimal') {
    return [
      commonClass,
      'border-b-2 px-0',
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    ]
  }

  if (appearance.tabStyle === 'chrome') {
    return [
      commonClass,
      'rounded-t-lg border border-b-0',
      isActive
        ? 'border-border bg-background text-foreground'
        : 'border-transparent text-muted-foreground hover:bg-background/70',
    ]
  }

  return [
    commonClass,
    'mb-1 rounded-md',
    isActive
      ? 'bg-primary-muted text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
  ]
}

function getTabLabel(tab: NavigationTab): string {
  return tab.titleKey ? t(tab.titleKey) : (tab.title ?? tab.routeName)
}

async function activateTab(tab: NavigationTab): Promise<void> {
  tabsStore.activateTab(tab.id)
  if (route.fullPath !== tab.fullPath)
    await router.push(tab.fullPath)
}

function getTabButtons(): HTMLButtonElement[] {
  return [...(tabList.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])]
}

async function focusAndActivateTab(tabIndex: number): Promise<void> {
  const tab = tabsStore.tabs[tabIndex]
  const tabButton = getTabButtons()[tabIndex]
  if (!tab || !tabButton)
    return

  tabButton.focus()
  await activateTab(tab)
}

async function closeTab(tab: NavigationTab): Promise<void> {
  const wasActive = tabsStore.activeTabId === tab.id
  const nextPath = tabsStore.closeTab(tab.id)
  if (wasActive && nextPath && nextPath !== route.fullPath)
    await router.push(nextPath)
}

async function closeTabAndRestoreFocus(tab: NavigationTab): Promise<void> {
  await closeTab(tab)
  await nextTick()

  const activeTabIndex = tabsStore.tabs.findIndex(
    candidate => candidate.id === tabsStore.activeTabId,
  )
  getTabButtons()[activeTabIndex]?.focus()
}

function handleTabClick(event: MouseEvent, tab: NavigationTab): void {
  // AI modified: the visual close target shares one semantic tab button; keyboard users use Delete.
  if (
    !tab.isAffix
    && event.target instanceof Element
    && event.target.closest('[data-admin-tab-close]')
  ) {
    void closeTabAndRestoreFocus(tab)
    return
  }
  void activateTab(tab)
}

function handleTabKeydown(event: KeyboardEvent, tab: NavigationTab): void {
  const currentTabIndex = tabsStore.tabs.findIndex(candidate => candidate.id === tab.id)
  if (currentTabIndex < 0)
    return

  let targetTabIndex: number | undefined
  switch (event.key) {
    case 'ArrowLeft':
      targetTabIndex = (currentTabIndex - 1 + tabsStore.tabs.length) % tabsStore.tabs.length
      break
    case 'ArrowRight':
      targetTabIndex = (currentTabIndex + 1) % tabsStore.tabs.length
      break
    case 'Home':
      targetTabIndex = 0
      break
    case 'End':
      targetTabIndex = tabsStore.tabs.length - 1
      break
    case 'Delete':
      if (!tab.isAffix) {
        event.preventDefault()
        void closeTabAndRestoreFocus(tab)
      }
      return
    default:
      return
  }

  event.preventDefault()
  // AI modified: automatic activation and roving focus keep the navigation tabs predictable by keyboard.
  void focusAndActivateTab(targetTabIndex)
}

watch(
  [() => tabsStore.tabs, locale, () => appearance.tabStyle],
  () => void nextTick(refreshTabGeometry),
  { deep: true, flush: 'post' },
)

onMounted(() => {
  void nextTick(() => {
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(updateOverflowIndicators)
      observeTabGeometry()
    }
    else {
      // AI modified: embedded browsers without ResizeObserver still refresh tab overflow on viewport changes.
      window.addEventListener('resize', updateOverflowIndicators)
      hasWindowResizeFallback = true
    }
    updateOverflowIndicators()
  })

  void document.fonts?.ready.then(refreshTabGeometry)
})

onBeforeUnmount(() => {
  isUnmounted = true
  resizeObserver?.disconnect()
  if (hasWindowResizeFallback)
    window.removeEventListener('resize', updateOverflowIndicators)
})
</script>

<template>
  <div class="relative min-w-0">
    <div
      ref="tabList"
      :class="containerClass"
      :data-tab-style="appearance.tabStyle"
      role="tablist"
      :aria-label="t('nav.openPageTabs')"
      :aria-describedby="hasOverflow ? overflowStatusId : undefined"
      @scroll.passive="updateOverflowIndicators"
    >
      <div
        v-for="tab in tabsStore.tabs"
        :key="tab.id"
        :class="tabClass(tab)"
        data-admin-tab
        role="presentation"
      >
        <button
          type="button"
          role="tab"
          class="flex h-full min-w-0 items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          :aria-selected="tabsStore.activeTabId === tab.id"
          :aria-keyshortcuts="tab.isAffix ? undefined : 'Delete'"
          :aria-describedby="tab.isAffix ? undefined : closeInstructionId"
          :tabindex="tabsStore.activeTabId === tab.id ? 0 : -1"
          @click="handleTabClick($event, tab)"
          @keydown="handleTabKeydown($event, tab)"
        >
          <span>{{ getTabLabel(tab) }}</span>
          <LockKeyhole v-if="tab.isAffix" class="size-3 text-muted-foreground" aria-hidden="true" />
          <span
            v-if="!tab.isAffix"
            class="-mr-1 rounded p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            data-admin-tab-close
            :title="`${t('common.close')} ${getTabLabel(tab)}`"
            aria-hidden="true"
          >
            <X class="size-3" />
          </span>
        </button>
      </div>
    </div>

    <div
      class="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r to-transparent transition-opacity duration-150 motion-reduce:transition-none"
      :class="[fadeSurfaceClass, canScrollLeft ? 'opacity-100' : 'opacity-0']"
      :data-visible="canScrollLeft ? 'true' : 'false'"
      data-tabs-overflow-left
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l to-transparent transition-opacity duration-150 motion-reduce:transition-none"
      :class="[fadeSurfaceClass, canScrollRight ? 'opacity-100' : 'opacity-0']"
      :data-visible="canScrollRight ? 'true' : 'false'"
      data-tabs-overflow-right
      aria-hidden="true"
    />
    <span :id="closeInstructionId" class="sr-only">
      {{ t('nav.closableTabHint') }}
    </span>
    <span
      v-if="overflowStatus"
      :id="overflowStatusId"
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ overflowStatus }}
    </span>
  </div>
</template>
