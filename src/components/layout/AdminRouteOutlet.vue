<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import { PERFORMANCE_BUDGET } from '@/lib/performance-contract'
import { useAppearanceStore } from '@/stores/appearance'
import { useTabsStore } from '@/stores/tabs'

const appearance = useAppearanceStore()
const tabsStore = useTabsStore()
const { keepAliveInclude } = storeToRefs(tabsStore)

const transitionName = 'admin-route-fade'

function getRouteViewKey(route: RouteLocationNormalizedLoaded): string {
  const currentActiveTab = tabsStore.activeTab
  if (currentActiveTab && currentActiveTab.routeName === route.name) {
    // AI modified: URL state inside one active tab must not remount and strand its cached page instance.
    return currentActiveTab.id
  }

  // Explicitly opened full-path tabs still own independent cached instances.
  return route.fullPath
}

function hideLeavingRouteFromAccessibility(element: Element): void {
  if (!(element instanceof HTMLElement))
    return

  // AI modified: parallel route animation must not expose two interactive pages to assistive technology.
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
}

function restoreEnteringRouteAccessibility(element: Element): void {
  if (!(element instanceof HTMLElement))
    return

  // AI modified: KeepAlive reuses the same DOM node after a leave, so remove its temporary isolation.
  element.inert = false
  element.removeAttribute('aria-hidden')
}
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <!-- AI modified: cached route deactivation must not block the incoming view on an out-in leave callback. -->
    <Transition
      :name="transitionName"
      :css="appearance.pageTransition !== 'none'"
      @before-enter="restoreEnteringRouteAccessibility"
      @before-leave="hideLeavingRouteFromAccessibility"
      @leave-cancelled="restoreEnteringRouteAccessibility"
    >
      <KeepAlive :include="keepAliveInclude" :max="PERFORMANCE_BUDGET.keepAliveMax">
        <component :is="Component" :key="getRouteViewKey(route)" />
      </KeepAlive>
    </Transition>
  </RouterView>
</template>

<style scoped>
.admin-route-fade-enter-active,
.admin-route-fade-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.admin-route-fade-enter-from,
.admin-route-fade-leave-to {
  opacity: 0;
}
</style>
