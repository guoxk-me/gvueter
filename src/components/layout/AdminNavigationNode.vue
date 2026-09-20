<script setup lang="ts">
import type { AdminNavigationVariant } from './layout-contract'
import type { NavigationMenuNode } from '@/features/navigation'
import { ChevronDown, ExternalLink } from '@lucide/vue'
import { m } from 'motion-v'
import { computed, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAdminMotionTransition } from '@/composables/use-admin-motion-transition'
import { ADMIN_MOTION_TRANSITIONS } from '@/lib/motion-contract'
import { getAdminNavigationIcon } from '@/router/admin-navigation'
import AdminNavigationLabel from './AdminNavigationLabel.vue'

defineOptions({ name: 'AdminNavigationNode' })

const props = withDefaults(
  defineProps<{
    node: NavigationMenuNode
    variant: AdminNavigationVariant
    collapsed?: boolean
    depth?: number
  }>(),
  {
    collapsed: false,
    depth: 0,
  },
)

const emit = defineEmits<{
  nodeSelected: [node: NavigationMenuNode]
}>()

const route = useRoute()
const { t } = useI18n()
const isExpanded = shallowRef(false)
const isFlyoutOpen = shallowRef(false)
const childListId = useId()
const chevronTransition = useAdminMotionTransition(ADMIN_MOTION_TRANSITIONS.fast)

const hasChildren = computed(() => props.node.children.length > 0)
const isDestinationActive = computed(
  () =>
    Boolean(props.node.to)
    && (route.path === props.node.to || route.path.startsWith(`${props.node.to}/`)),
)
const isBranchActive = computed(
  () => isDestinationActive.value || branchContainsPath(props.node, route.path),
)
const isCompact = computed(() => props.variant === 'rail' || props.collapsed)
// AI modified: horizontal roots stay text-first so wide desktops can expose the full menu; rails and flyouts retain icons.
const shouldShowIcon = computed(() => props.variant !== 'horizontal')
const canShowChildren = computed(() => hasChildren.value && !isCompact.value && isExpanded.value)
const childVariant = computed<AdminNavigationVariant>(() =>
  props.variant === 'horizontal' ? 'vertical' : props.variant,
)
const childDepth = computed(() => (props.variant === 'horizontal' ? 0 : props.depth + 1))
const containerClass = computed(() => [
  'relative min-w-0',
  props.variant === 'horizontal' ? 'shrink-0' : 'w-full',
])
const destinationClass = computed(() => [
  'group relative flex w-full items-center gap-2 rounded-md px-2.5 text-sm font-medium outline-none transition-colors',
  'focus-visible:ring-2 focus-visible:ring-ring/60',
  props.variant === 'vertical' && props.depth > 0 ? 'min-h-9.5' : 'min-h-10',
  isDestinationActive.value
    ? props.variant === 'horizontal'
      ? 'text-primary shadow-[inset_0_-2px_0_var(--primary)]'
      : 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]'
    : isBranchActive.value
      ? 'text-sidebar-accent-foreground'
      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  props.variant === 'horizontal' ? 'whitespace-nowrap' : '',
  isCompact.value ? 'justify-center px-2' : '',
])
const childrenClass = computed(() => [
  props.variant === 'horizontal'
    ? 'absolute left-0 top-full z-40 mt-1 min-w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg'
    : [
        'mt-1 space-y-1',
        // AI modified: cap nested rails after level two so deep menus stay readable.
        props.depth === 0 ? 'ml-4 border-l border-border/70 pl-2' : '',
      ],
])

function branchContainsPath(menuNode: NavigationMenuNode, path: string): boolean {
  return menuNode.children.some(
    childNode =>
      (Boolean(childNode.to) && (path === childNode.to || path.startsWith(`${childNode.to}/`)))
      || branchContainsPath(childNode, path),
  )
}

function selectBranch(event: MouseEvent): void {
  emit('nodeSelected', props.node)
  if (props.variant !== 'rail')
    isExpanded.value = !isExpanded.value

  const branchTrigger = event.currentTarget
  // AI modified: Safari pointer clicks retain a keyboard target so Escape can close the flyout.
  if (props.variant === 'horizontal' && branchTrigger instanceof HTMLElement)
    branchTrigger.focus()
}

function selectCompactBranch(): void {
  emit('nodeSelected', props.node)
}

function toggleCompactBranch(): void {
  // AI modified: prevent native keyboard clicks from double-toggling the controlled flyout.
  isFlyoutOpen.value = !isFlyoutOpen.value
  emit('nodeSelected', props.node)
}

function selectDestination(): void {
  emit('nodeSelected', props.node)
}

function relaySelection(menuNode: NavigationMenuNode): void {
  if (props.variant === 'horizontal')
    isExpanded.value = false
  emit('nodeSelected', menuNode)
}

function relayFlyoutSelection(menuNode: NavigationMenuNode): void {
  // AI modified: branch clicks keep the flyout open so users can traverse inactive deep menus.
  if (menuNode.to || menuNode.href)
    isFlyoutOpen.value = false
  emit('nodeSelected', menuNode)
}

function closeHorizontalBranch(event: FocusEvent): void {
  if (props.variant !== 'horizontal')
    return

  const currentTarget = event.currentTarget as HTMLElement
  const nextTarget = event.relatedTarget
  if (!(nextTarget instanceof Node) || !currentTarget.contains(nextTarget))
    isExpanded.value = false
}

watch(
  [isBranchActive, () => props.variant],
  ([isActive, variant]) => {
    // AI modified: only inline navigation reveals active ancestors; top flyouts remain user-controlled.
    if (isActive && variant === 'vertical')
      isExpanded.value = true
    if (variant === 'horizontal')
      isExpanded.value = false
  },
  { immediate: true },
)
</script>

<template>
  <!-- AI modified: stable node identity exposes active ancestor restoration without relying on translated labels. -->
  <li
    :class="containerClass"
    :data-navigation-node-id="node.id"
    :data-navigation-active="isBranchActive ? 'true' : 'false'"
    @focusout="closeHorizontalBranch"
  >
    <!-- AI modified: every visually truncated navigation target exposes its complete translated label. -->
    <Popover v-if="hasChildren && isCompact" v-model:open="isFlyoutOpen">
      <PopoverTrigger as-child>
        <button
          type="button"
          data-admin-navigation-target
          :class="destinationClass"
          :aria-label="t(node.titleKey)"
          :title="t(node.titleKey)"
          @click="selectCompactBranch"
          @keydown.enter.prevent="toggleCompactBranch"
          @keydown.space.prevent="toggleCompactBranch"
        >
          <component
            :is="getAdminNavigationIcon(node.icon)"
            class="size-4 shrink-0"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        class="max-h-(--reka-popover-content-available-height) w-[var(--admin-navigation-flyout-width)] overflow-y-auto p-1.5"
      >
        <p class="px-2 pb-1.5 pt-1 text-xs font-semibold text-muted-foreground">
          {{ t(node.titleKey) }}
        </p>
        <ul class="space-y-1">
          <AdminNavigationNode
            v-for="childNode in node.children"
            :key="childNode.id"
            :node="childNode"
            variant="vertical"
            :depth="0"
            @node-selected="relayFlyoutSelection"
          />
        </ul>
      </PopoverContent>
    </Popover>

    <button
      v-else-if="hasChildren"
      type="button"
      data-admin-navigation-target
      :class="destinationClass"
      :aria-label="t(node.titleKey)"
      :aria-expanded="variant === 'rail' ? undefined : isExpanded"
      :aria-controls="variant === 'rail' ? undefined : childListId"
      :title="t(node.titleKey)"
      @click="selectBranch"
      @keydown.esc="isExpanded = false"
    >
      <component
        :is="getAdminNavigationIcon(node.icon)"
        v-if="shouldShowIcon"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <AdminNavigationLabel :collapsed="isCompact" :label="t(node.titleKey)" text-align="left" />
      <m.span
        v-if="!isCompact"
        class="flex size-3.5 shrink-0 items-center justify-center"
        :animate="{ rotate: isExpanded ? 180 : 0 }"
        :transition="chevronTransition"
        aria-hidden="true"
        data-motion-part="navigation-chevron"
      >
        <ChevronDown class="size-3.5" />
      </m.span>
    </button>

    <RouterLink
      v-else-if="node.to"
      :to="node.to"
      data-admin-navigation-target
      :class="destinationClass"
      :aria-label="t(node.titleKey)"
      :aria-current="isDestinationActive ? 'page' : undefined"
      :title="t(node.titleKey)"
      @click="selectDestination"
    >
      <component
        :is="getAdminNavigationIcon(node.icon)"
        v-if="shouldShowIcon"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <AdminNavigationLabel :collapsed="isCompact" :label="t(node.titleKey)" />
    </RouterLink>

    <a
      v-else-if="node.href"
      :href="node.href"
      data-admin-navigation-target
      target="_blank"
      rel="noopener noreferrer"
      :class="destinationClass"
      :aria-label="t(node.titleKey)"
      :title="t(node.titleKey)"
      @click="selectDestination"
    >
      <component
        :is="getAdminNavigationIcon(node.icon)"
        v-if="shouldShowIcon"
        class="size-4 shrink-0"
        aria-hidden="true"
      />
      <AdminNavigationLabel :collapsed="isCompact" :label="t(node.titleKey)" />
      <ExternalLink v-if="!isCompact" class="size-3.5 shrink-0" aria-hidden="true" />
    </a>

    <!-- AI modified: collapsed branches do not retain an invisible recursive subtree in the DOM. -->
    <ul v-if="canShowChildren" :id="childListId" :class="childrenClass">
      <AdminNavigationNode
        v-for="childNode in node.children"
        :key="childNode.id"
        :node="childNode"
        :variant="childVariant"
        :depth="childDepth"
        @node-selected="relaySelection"
      />
    </ul>
  </li>
</template>
