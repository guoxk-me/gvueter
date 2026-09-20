<script setup lang="ts">
import type { VariantType } from 'motion-v'
import type { CSSProperties } from 'vue'
import type { NavigationMenuNode } from '@/features/navigation'
import { useMediaQuery } from '@vueuse/core'
import { AnimatePresence, m } from 'motion-v'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AppearancePanel from '@/components/layout/AppearancePanel.vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAdminMotionTransition } from '@/composables/use-admin-motion-transition'
import { ADMIN_MOTION_TRANSITIONS, ADMIN_MOTION_VARIANTS } from '@/lib/motion-contract'
import { useAppearanceStore } from '@/stores/appearance'
import { useMenuStore } from '@/stores/menu'
import AdminBrand from './AdminBrand.vue'
import AdminContextBar from './AdminContextBar.vue'
import AdminFooter from './AdminFooter.vue'
import AdminHeader from './AdminHeader.vue'
import AdminNavigation from './AdminNavigation.vue'
import AdminRouteOutlet from './AdminRouteOutlet.vue'
import AdminWatermark from './AdminWatermark.vue'
import { getAdminLayoutDefinition, getAdminNavigationWidths } from './layout-contract'
import SidebarCollapseIcon from './SidebarCollapseIcon.vue'

interface AdminLayoutStyle extends CSSProperties {
  '--admin-grid-areas': string
  '--admin-grid-columns': string
  '--admin-grid-rows': string
}

const appearance = useAppearanceStore()
const menuStore = useMenuStore()
const route = useRoute()
const { t } = useI18n()

const isAppearanceOpen = shallowRef(false)
const isMobileNavigationOpen = shallowRef(false)
const isSidebarCollapsed = shallowRef(false)
const isSidebarMotionEnabled = shallowRef(false)
const selectedRootMenuId = shallowRef<string>()
const isNarrowDesktop = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)')

const layoutDefinition = computed(() => getAdminLayoutDefinition(appearance.layout))
const hasCollapsibleSidebar = computed(() => layoutDefinition.value.collapseTarget !== 'none')
const isEffectiveSidebarCollapsed = computed(
  // AI modified: the 1024–1279 workspace uses the confirmed 72px rail to protect content width.
  () => hasCollapsibleSidebar.value && (isNarrowDesktop.value || isSidebarCollapsed.value),
)
const activeRootMenu = computed(() =>
  menuStore.visibleMenus.find(menuNode => branchContainsPath(menuNode, route.path)),
)
const selectedRootMenu = computed(
  () =>
    menuStore.visibleMenus.find(menuNode => menuNode.id === selectedRootMenuId.value)
    ?? activeRootMenu.value
    ?? menuStore.visibleMenus[0],
)
const secondaryMenuNodes = computed<NavigationMenuNode[]>(() => {
  const selectedMenu = selectedRootMenu.value
  if (!selectedMenu)
    return []
  return selectedMenu.children.length ? selectedMenu.children : [selectedMenu]
})
const hasHeaderNavigation = computed(() => layoutDefinition.value.primaryNavigation === 'header')
const hasDesktopHeaderBrand = computed(() => layoutDefinition.value.brandPlacement === 'header')
const primaryOwnsMainBoundary = computed(
  () =>
    layoutDefinition.value.primaryNavigation !== 'header'
    && (layoutDefinition.value.secondaryNavigation !== 'sidebar' || isEffectiveSidebarCollapsed.value),
)
const secondaryOwnsMainBoundary = computed(
  // AI modified: a collapsed secondary rail still owns the boundary when no primary rail is rendered.
  () =>
    layoutDefinition.value.secondaryNavigation === 'sidebar'
    && (!isEffectiveSidebarCollapsed.value || layoutDefinition.value.primaryNavigation === 'header'),
)
const showsPrimaryCollapseControl = computed(
  () =>
    !isNarrowDesktop.value
    && (layoutDefinition.value.collapseTarget === 'primary'
      || (appearance.layout === 'mixed' && layoutDefinition.value.collapseTarget === 'secondary')),
)
const showsSecondaryCollapseControl = computed(
  () =>
    !isNarrowDesktop.value
    && layoutDefinition.value.collapseTarget === 'secondary'
    && appearance.layout !== 'mixed',
)
const contentClass = computed(() =>
  appearance.contentWidth === 'boxed' ? 'mx-auto w-full max-w-screen-xl' : 'w-full',
)
const navigationWidths = computed(() =>
  getAdminNavigationWidths(appearance.layout, isEffectiveSidebarCollapsed.value),
)
const sidebarLayoutTransition = useAdminMotionTransition(ADMIN_MOTION_TRANSITIONS.layout)
const sidebarTitleTransition = useAdminMotionTransition(ADMIN_MOTION_TRANSITIONS.standard)
const layoutStyle = computed<AdminLayoutStyle>(() => ({
  '--admin-grid-areas': layoutDefinition.value.gridTemplateAreas,
  '--admin-grid-columns': layoutDefinition.value.gridTemplateColumns,
  '--admin-grid-rows': layoutDefinition.value.gridTemplateRows,
}))
const layoutMotionTarget = computed<VariantType>(() => ({
  '--admin-sidebar-width': navigationWidths.value.primary,
  '--admin-secondary-width': navigationWidths.value.secondary,
}))
const layoutMotionTransition = computed(() =>
  isSidebarMotionEnabled.value ? sidebarLayoutTransition.value : ADMIN_MOTION_TRANSITIONS.instant,
)
const collapseActionLabel = computed(() =>
  t(isEffectiveSidebarCollapsed.value ? 'appearance.expandSidebar' : 'appearance.collapseSidebar'),
)

function branchContainsPath(menuNode: NavigationMenuNode, path: string): boolean {
  return (
    (Boolean(menuNode.to) && (path === menuNode.to || path.startsWith(`${menuNode.to}/`)))
    || menuNode.children.some(childNode => branchContainsPath(childNode, path))
  )
}

function rootMenuForNode(nodeId: string): NavigationMenuNode | undefined {
  return menuStore.visibleMenus.find(
    rootMenu => rootMenu.id === nodeId || branchContainsNode(rootMenu, nodeId),
  )
}

function branchContainsNode(menuNode: NavigationMenuNode, nodeId: string): boolean {
  return menuNode.children.some(
    childNode => childNode.id === nodeId || branchContainsNode(childNode, nodeId),
  )
}

function selectPrimaryNode(menuNode: NavigationMenuNode): void {
  selectedRootMenuId.value = rootMenuForNode(menuNode.id)?.id ?? menuNode.id
}

function selectMobileNode(menuNode: NavigationMenuNode): void {
  selectPrimaryNode(menuNode)
  if (menuNode.to || menuNode.href)
    isMobileNavigationOpen.value = false
}

function toggleSidebar(): void {
  if (!hasCollapsibleSidebar.value)
    return
  // AI modified: manual collapse is current Shell state; sidebarDefault remains the startup preference.
  isSidebarMotionEnabled.value = true
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

watch(
  [() => appearance.sidebarDefault, () => appearance.layout],
  ([sidebarDefault]) => {
    // AI modified: layout-mode changes switch structure atomically instead of animating incompatible grids.
    isSidebarMotionEnabled.value = false
    isSidebarCollapsed.value = sidebarDefault === 'collapsed'
  },
  { immediate: true },
)

watch(
  [() => route.path, () => menuStore.visibleMenus],
  () => {
    if (activeRootMenu.value)
      selectedRootMenuId.value = activeRootMenu.value.id
    else if (!rootMenuForNode(selectedRootMenuId.value ?? ''))
      selectedRootMenuId.value = menuStore.visibleMenus[0]?.id
  },
  { immediate: true },
)
</script>

<template>
  <!-- AI modified: current Shell state is observable independently from the persisted startup preference. -->
  <m.div
    class="admin-layout relative grid h-svh min-h-svh overflow-hidden bg-background text-foreground"
    :data-layout="appearance.layout"
    :data-sidebar-state="isEffectiveSidebarCollapsed ? 'collapsed' : 'expanded'"
    :style="layoutStyle"
    :initial="false"
    :animate="layoutMotionTarget"
    :transition="layoutMotionTransition"
    data-motion-surface="admin-layout"
  >
    <!-- AI modified: keyboard users can bypass repeated Shell controls and land on the active route. -->
    <a
      href="#admin-main-content"
      class="sr-only z-100 rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2 focus:ring-ring"
    >
      {{ t('common.skipToContent') }}
    </a>

    <AdminHeader
      class="admin-layout__header z-30"
      :is-mobile-navigation-open="isMobileNavigationOpen"
      :show-brand="hasDesktopHeaderBrand"
      :navigation-nodes="hasHeaderNavigation ? menuStore.visibleMenus : []"
      :is-breadcrumb-visible="appearance.isBreadcrumbVisible"
      :has-breadcrumb-icon="appearance.hasBreadcrumbIcon"
      @open-appearance="isAppearanceOpen = true"
      @toggle-mobile-navigation="isMobileNavigationOpen = !isMobileNavigationOpen"
      @navigation-node-selected="selectPrimaryNode"
    />

    <aside
      v-if="layoutDefinition.primaryNavigation !== 'header'"
      class="admin-layout__primary relative hidden min-h-0 flex-col overflow-visible bg-sidebar text-sidebar-foreground lg:flex"
      :class="primaryOwnsMainBoundary ? 'border-r border-sidebar-border' : ''"
      data-layout-region="primary-navigation"
    >
      <AdminBrand
        v-if="!hasDesktopHeaderBrand"
        class="hidden h-[var(--admin-shell-header-height)] px-3 lg:flex"
        :show-label="layoutDefinition.primaryNavigation !== 'rail' && !isEffectiveSidebarCollapsed"
      />

      <!-- AI modified: edge controls share the 56px brand/header center line and one Tooltip contract. -->
      <Tooltip v-if="showsPrimaryCollapseControl">
        <TooltipTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            class="absolute -right-3 top-3.5 z-40 size-7 rounded-full bg-background text-foreground shadow-sm"
            :aria-label="collapseActionLabel"
            @click="toggleSidebar"
          >
            <SidebarCollapseIcon :collapsed="isEffectiveSidebarCollapsed" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {{ collapseActionLabel }}
        </TooltipContent>
      </Tooltip>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <!-- AI modified: simultaneous navigation landmarks receive distinct localized names. -->
        <AdminNavigation
          :nodes="menuStore.visibleMenus"
          :variant="layoutDefinition.primaryNavigation === 'rail' ? 'rail' : 'vertical'"
          :collapsed="layoutDefinition.primaryNavigation === 'rail' || isEffectiveSidebarCollapsed"
          :aria-label="t('nav.primaryNavigation')"
          @node-selected="selectPrimaryNode"
        />
      </div>
    </aside>

    <aside
      v-if="layoutDefinition.secondaryNavigation === 'sidebar'"
      class="admin-layout__secondary relative hidden min-h-0 flex-col overflow-visible bg-surface lg:flex"
      :class="secondaryOwnsMainBoundary ? 'border-r border-border' : ''"
      data-layout-region="secondary-navigation"
    >
      <AnimatePresence :initial="false" mode="popLayout">
        <m.div
          v-if="!isEffectiveSidebarCollapsed"
          key="secondary-navigation-title"
          class="shrink-0 px-3 pb-1 pt-4"
          :initial="ADMIN_MOTION_VARIANTS.sidebarTitle.initial"
          :animate="ADMIN_MOTION_VARIANTS.sidebarTitle.visible"
          :exit="ADMIN_MOTION_VARIANTS.sidebarTitle.exit"
          :transition="sidebarTitleTransition"
        >
          <span class="truncate px-1 text-xs font-semibold text-muted-foreground">
            {{ selectedRootMenu ? t(selectedRootMenu.titleKey) : t('nav.navigation') }}
          </span>
        </m.div>
      </AnimatePresence>
      <Tooltip v-if="showsSecondaryCollapseControl">
        <TooltipTrigger as-child>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            class="absolute -right-3 top-3.5 z-40 size-7 rounded-full bg-background text-foreground shadow-sm"
            :aria-label="collapseActionLabel"
            @click="toggleSidebar"
          >
            <SidebarCollapseIcon :collapsed="isEffectiveSidebarCollapsed" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {{ collapseActionLabel }}
        </TooltipContent>
      </Tooltip>
      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <AdminNavigation
          :nodes="secondaryMenuNodes"
          variant="vertical"
          :collapsed="isEffectiveSidebarCollapsed"
          :aria-label="t('nav.secondaryNavigation')"
          @node-selected="selectPrimaryNode"
        />
      </div>
    </aside>

    <div
      v-if="layoutDefinition.secondaryNavigation === 'horizontal'"
      class="admin-layout__secondary hidden min-w-0 items-center overflow-visible border-b border-border bg-surface px-3 py-1.5 lg:flex"
      data-layout-region="secondary-navigation"
    >
      <AdminNavigation
        :nodes="secondaryMenuNodes"
        variant="horizontal"
        :aria-label="t('nav.secondaryNavigation')"
        @node-selected="selectPrimaryNode"
      />
    </div>

    <div class="admin-layout__body relative z-0 flex min-h-0 min-w-0 flex-col overflow-hidden">
      <AdminContextBar
        :is-tabs-visible="appearance.isTabsVisible"
      />

      <main
        id="admin-main-content"
        tabindex="-1"
        class="relative min-h-0 flex-1 overflow-y-auto p-[var(--admin-page-padding)] outline-none md:p-[var(--admin-page-padding-wide)]"
      >
        <AdminWatermark v-if="appearance.isWatermarkVisible" />
        <div class="relative z-10" :class="contentClass" data-layout-region="route-content">
          <AdminRouteOutlet />
        </div>
      </main>

      <AdminFooter v-if="appearance.isFooterVisible" class="shrink-0" />
    </div>
  </m.div>

  <Sheet v-model:open="isMobileNavigationOpen">
    <SheetContent
      id="admin-mobile-navigation"
      side="left"
      class="w-[min(20rem,calc(100vw-3rem))] max-w-none p-0"
    >
      <SheetHeader class="border-b border-border">
        <SheetTitle>{{ t('nav.navigation') }}</SheetTitle>
        <SheetDescription>{{ t('appearance.layoutDesc') }}</SheetDescription>
      </SheetHeader>
      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <AdminNavigation :nodes="menuStore.visibleMenus" @node-selected="selectMobileNode" />
      </div>
    </SheetContent>
  </Sheet>

  <AppearancePanel v-model:open="isAppearanceOpen" />
</template>

<style scoped>
.admin-layout {
  grid-template-areas: var(--admin-grid-areas);
  grid-template-columns: var(--admin-grid-columns);
  grid-template-rows: var(--admin-grid-rows);
}

.admin-layout__header {
  grid-area: header;
}

.admin-layout__primary {
  grid-area: primary;
}

.admin-layout__secondary {
  grid-area: secondary;
}

.admin-layout__body {
  grid-area: body;
}

/* AI modified: Shell CSS and header controls share the 64rem desktop navigation contract. */
@media (max-width: 63.999rem) {
  .admin-layout {
    grid-template-areas: 'header' 'body';
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
}
</style>
