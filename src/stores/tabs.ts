import type { RouteLocationNormalized } from 'vue-router'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import {
  getBrowserStorage,
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from '@/lib/browser-storage'
import { getActiveTabIdAfterClose } from '@/stores/tab-navigation'

const LEGACY_TABS_STORAGE_KEY = 'admin-tabs'
const TABS_STORAGE_KEY_PREFIX = 'admin-tabs'

export interface NavigationTab {
  id: string
  routeName: string
  fullPath: string
  title?: string
  titleKey?: string
  cacheKey?: string
  isKeepAlive: boolean
  isAffix: boolean
}

interface StoredTabsState {
  activeTabId: string | null
  tabs: NavigationTab[]
}

function isNavigationTab(tab: unknown): tab is NavigationTab {
  if (!tab || typeof tab !== 'object') return false

  const candidate = tab as Partial<NavigationTab>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.routeName === 'string' &&
    typeof candidate.fullPath === 'string' &&
    typeof candidate.isKeepAlive === 'boolean' &&
    typeof candidate.isAffix === 'boolean' &&
    (candidate.title === undefined || typeof candidate.title === 'string') &&
    (candidate.titleKey === undefined || typeof candidate.titleKey === 'string') &&
    (candidate.cacheKey === undefined || typeof candidate.cacheKey === 'string')
  )
}

export function getTabsStorageKey(principalId: string): string {
  return `${TABS_STORAGE_KEY_PREFIX}:${encodeURIComponent(principalId)}`
}

function readStoredTabs(storage: Storage, principalId: string): StoredTabsState {
  try {
    const storedState = JSON.parse(
      safeStorageGet(storage, getTabsStorageKey(principalId)) ?? '{}',
    ) as {
      activeTabId?: unknown
      tabs?: unknown
    }
    const storedTabs = Array.isArray(storedState.tabs)
      ? storedState.tabs.filter(isNavigationTab)
      : []
    const activeTabId =
      typeof storedState.activeTabId === 'string' &&
      storedTabs.some((tab) => tab.id === storedState.activeTabId)
        ? storedState.activeTabId
        : null

    return { activeTabId, tabs: storedTabs }
  } catch {
    return { activeTabId: null, tabs: [] }
  }
}

export const useTabsStore = defineStore('tabs', () => {
  const browserStorage = getBrowserStorage('local')
  // AI modified: unowned tab state is discarded so it cannot cross an account boundary.
  safeStorageRemove(browserStorage, LEGACY_TABS_STORAGE_KEY)
  const boundPrincipalId = shallowRef<string | null>(null)
  const tabs = ref<NavigationTab[]>([])
  const activeTabId = shallowRef<string | null>(null)

  const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeTabId.value) ?? null)
  const keepAliveInclude = computed(() => [
    ...new Set(
      tabs.value
        .filter((tab) => tab.isKeepAlive && tab.cacheKey)
        .map((tab) => tab.cacheKey as string),
    ),
  ])

  function persistTabs(): void {
    if (!browserStorage || !boundPrincipalId.value) return

    // AI modified: tab navigation stays usable in memory when persistence is blocked or full.
    safeStorageSet(
      browserStorage,
      getTabsStorageKey(boundPrincipalId.value),
      JSON.stringify({
        activeTabId: activeTabId.value,
        tabs: tabs.value,
      } satisfies StoredTabsState),
    )
  }

  watch([tabs, activeTabId], persistTabs, { deep: true, flush: 'sync' })

  function bindPrincipal(principalId: string | null): void {
    if (boundPrincipalId.value === principalId) return

    boundPrincipalId.value = principalId
    const storedState =
      browserStorage && principalId ? readStoredTabs(browserStorage, principalId) : null
    tabs.value = storedState?.tabs ?? []
    activeTabId.value = storedState?.activeTabId ?? null
  }

  function openTab(tab: NavigationTab): void {
    const existingTabIndex = tabs.value.findIndex((candidate) => candidate.id === tab.id)
    if (existingTabIndex >= 0) tabs.value.splice(existingTabIndex, 1, tab)
    else tabs.value.push(tab)

    activeTabId.value = tab.id
  }

  function openRouteTab(route: RouteLocationNormalized): void {
    if (!route.meta.requiresAuth || route.meta.tab === false || typeof route.name !== 'string')
      return

    const currentActiveTab = activeTab.value
    // AI modified: query-only state changes update the active logical page instead of spawning duplicate tabs.
    const routeTabId =
      currentActiveTab?.routeName === route.name ? currentActiveTab.id : route.fullPath
    openTab({
      id: routeTabId,
      routeName: route.name,
      fullPath: route.fullPath,
      title: route.meta.title,
      titleKey: route.meta.titleKey,
      cacheKey: route.meta.cacheKey,
      isKeepAlive: route.meta.keepAlive ?? false,
      isAffix: route.meta.affix ?? false,
    })
  }

  function closeTab(tabId: string): string | undefined {
    const tabIndex = tabs.value.findIndex((tab) => tab.id === tabId)
    if (tabIndex < 0 || tabs.value[tabIndex]?.isAffix) return activeTab.value?.fullPath

    // AI modified: select the adjacent route before mutation so closing the last tab is deterministic.
    const nextActiveTabId = getActiveTabIdAfterClose(tabs.value, activeTabId.value, tabId)
    tabs.value.splice(tabIndex, 1)
    activeTabId.value = nextActiveTabId
    return tabs.value.find((tab) => tab.id === nextActiveTabId)?.fullPath
  }

  function closeOtherTabs(tabId: string): void {
    tabs.value = tabs.value.filter((tab) => tab.id === tabId || tab.isAffix)
    activeTabId.value = tabs.value.some((tab) => tab.id === tabId)
      ? tabId
      : (tabs.value[0]?.id ?? null)
  }

  function closeAllTabs(): string | undefined {
    tabs.value = tabs.value.filter((tab) => tab.isAffix)
    activeTabId.value = tabs.value[0]?.id ?? null
    return tabs.value[0]?.fullPath
  }

  function activateTab(tabId: string): void {
    if (tabs.value.some((tab) => tab.id === tabId)) activeTabId.value = tabId
  }

  function removeRouteTabs(routeNames: Iterable<string>): void {
    const unavailableRouteNames = new Set(routeNames)
    const previousActiveTabId = activeTabId.value
    tabs.value = tabs.value.filter((tab) => !unavailableRouteNames.has(tab.routeName))

    if (previousActiveTabId && !tabs.value.some((tab) => tab.id === previousActiveTabId))
      activeTabId.value = tabs.value[0]?.id ?? null
  }

  function retainAvailableRoutes(routeNames: Iterable<string>): void {
    const availableRouteNames = new Set(routeNames)
    const staleRouteNames = tabs.value
      .filter((tab) => !availableRouteNames.has(tab.routeName))
      .map((tab) => tab.routeName)
    removeRouteTabs(staleRouteNames)
  }

  function resetTabs(): void {
    tabs.value = []
    activeTabId.value = null
  }

  return {
    tabs,
    activeTabId,
    boundPrincipalId,
    activeTab,
    keepAliveInclude,
    bindPrincipal,
    openTab,
    openRouteTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    activateTab,
    removeRouteTabs,
    retainAvailableRoutes,
    resetTabs,
  }
})
