<script setup lang="ts" generic="TValue extends string = string">
import type { TreeNode, VisibleTreeNode } from './tree-view'
import { ChevronDown, ChevronRight, LoaderCircle, RotateCcw } from '@lucide/vue'
import { useTemplateRefsList } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const props = withDefaults(
  defineProps<{
    nodes: readonly TreeNode<TValue>[]
    label?: string
    emptyLabel?: string
    selectable?: boolean
    checkable?: boolean
    includeParentWhenChecked?: boolean
    expandAll?: boolean
    expandLabel?: string
    collapseLabel?: string
    checkLabel?: string
    loadingLabel?: string
    retryLoadLabel?: string
    loadChildren?: (node: TreeNode<TValue>) => Promise<readonly TreeNode<TValue>[]>
  }>(),
  {
    selectable: true,
    checkable: false,
    includeParentWhenChecked: false,
    expandAll: false,
  },
)

const emit = defineEmits<{
  select: [node: TreeNode<TValue>]
  check: [node: TreeNode<TValue>, checked: boolean]
  load: [node: TreeNode<TValue>, children: readonly TreeNode<TValue>[]]
  loadError: [node: TreeNode<TValue>, error: unknown]
}>()

defineSlots<{
  node?: (props: { node: TreeNode<TValue>, depth: number, isSelected: boolean }) => unknown
  empty?: () => unknown
}>()

const selectedId = defineModel<TValue | null>('selectedId', { default: null })
const { t } = useI18n()
const treeLabel = computed(() => props.label ?? t('components.defaults.tree'))
const emptyStateLabel = computed(() => props.emptyLabel ?? t('components.defaults.noNodes'))
const expandActionLabel = computed(() => props.expandLabel ?? t('components.defaults.expand'))
const collapseActionLabel = computed(() => props.collapseLabel ?? t('components.defaults.collapse'))
const checkActionLabel = computed(
  () => props.checkLabel ?? t('components.defaults.toggleSelection'),
)
const loadingActionLabel = computed(() => props.loadingLabel ?? t('common.loading'))
const retryLoadActionLabel = computed(() => props.retryLoadLabel ?? t('common.retry'))
const checkedIds = defineModel<TValue[]>('checkedIds', { default: () => [] })
const expandedIds = defineModel<TValue[]>('expandedIds', { default: () => [] })
const activeId = shallowRef<TValue | null>(null)
const treeItemRefs = useTemplateRefsList<HTMLElement>()
const loadedChildren = shallowRef<ReadonlyMap<TValue, readonly TreeNode<TValue>[]>>(new Map())
const loadingIds = shallowRef<ReadonlySet<TValue>>(new Set())
const failedLoadIds = shallowRef<ReadonlySet<TValue>>(new Set())
const loadStatusMessage = shallowRef('')
const activeLoadOperations = new Map<TValue, symbol>()
let nodeRevision = 0
let isMounted = true

const expandedSet = computed(() => new Set(expandedIds.value))
const checkedSet = computed(() => new Set(checkedIds.value))
const visibleNodes = computed(() => collectVisibleNodes(props.nodes, expandedSet.value))

function getNodeChildren(node: TreeNode<TValue>): readonly TreeNode<TValue>[] {
  return loadedChildren.value.get(node.id) ?? node.children ?? []
}

function hasExpandableChildren(node: TreeNode<TValue>): boolean {
  if (loadedChildren.value.has(node.id))
    return getNodeChildren(node).length > 0
  return node.hasChildren === true || getNodeChildren(node).length > 0
}

watch(
  visibleNodes,
  (nodes) => {
    if (!nodes.some(item => item.node.id === activeId.value))
      activeId.value = nodes.find(item => !item.node.disabled)?.node.id ?? null
  },
  { immediate: true },
)

watch(
  () => props.nodes,
  (nodes) => {
    if (!props.expandAll || expandedIds.value.length > 0)
      return

    // AI modified: initialize expanded state once from the data tree without mutating caller-owned nodes.
    expandedIds.value = collectExpandableIds(nodes)
  },
  { immediate: true },
)

watch(
  () => props.nodes,
  () => {
    // AI modified: invalidate in-flight branch loads as well as cached children when the caller replaces the tree.
    nodeRevision += 1
    activeLoadOperations.clear()
    loadedChildren.value = new Map()
    loadingIds.value = new Set()
    failedLoadIds.value = new Set()
    loadStatusMessage.value = ''
  },
)

onBeforeUnmount(() => {
  // AI modified: late async branch results must not mutate or emit from an unmounted tree.
  isMounted = false
  nodeRevision += 1
  activeLoadOperations.clear()
})

function collectVisibleNodes(
  nodes: readonly TreeNode<TValue>[],
  expandedNodeIds: ReadonlySet<TValue>,
  depth = 0,
): VisibleTreeNode<TValue>[] {
  const collectedNodes: VisibleTreeNode<TValue>[] = []
  for (const node of nodes) {
    const children = getNodeChildren(node)
    const hasChildren = hasExpandableChildren(node)
    collectedNodes.push({ node, depth, hasChildren })
    if (children.length > 0 && expandedNodeIds.has(node.id))
      collectedNodes.push(...collectVisibleNodes(children, expandedNodeIds, depth + 1))
  }
  return collectedNodes
}

function collectExpandableIds(nodes: readonly TreeNode<TValue>[]): TValue[] {
  const collectedIds: TValue[] = []
  for (const node of nodes) {
    const children = getNodeChildren(node)
    if (children.length === 0)
      continue

    collectedIds.push(node.id, ...collectExpandableIds(children))
  }
  return collectedIds
}

function collectCheckableNodeIds(node: TreeNode<TValue>): TValue[] {
  if (node.disabled)
    return []
  const children = getNodeChildren(node)
  if (children.length === 0)
    return hasExpandableChildren(node) ? [] : [node.id]

  const descendantIds = children.flatMap(child => collectCheckableNodeIds(child))
  // AI modified: organization scopes can include the selected branch root as well as descendants.
  return props.includeParentWhenChecked ? [node.id, ...descendantIds] : descendantIds
}

function getCheckedState(node: TreeNode<TValue>): boolean | 'indeterminate' {
  const checkableIds = collectCheckableNodeIds(node)
  const checkedNodeCount = checkableIds.filter(id => checkedSet.value.has(id)).length
  if (checkedNodeCount === 0)
    return false
  if (checkedNodeCount === checkableIds.length)
    return true
  return 'indeterminate'
}

function getAriaChecked(node: TreeNode<TValue>): boolean | 'mixed' {
  const checkedState = getCheckedState(node)
  return checkedState === 'indeterminate' ? 'mixed' : checkedState
}

async function toggleExpanded(item: VisibleTreeNode<TValue>): Promise<void> {
  if (!item.hasChildren)
    return

  if (expandedSet.value.has(item.node.id)) {
    expandedIds.value = expandedIds.value.filter(id => id !== item.node.id)
    return
  }

  const shouldLoadChildren = Boolean(
    props.loadChildren
    && item.node.children === undefined
    && !loadedChildren.value.has(item.node.id),
  )
  if (!shouldLoadChildren) {
    expandedIds.value = [...expandedIds.value, item.node.id]
    return
  }
  if (loadingIds.value.has(item.node.id))
    return

  loadingIds.value = new Set([...loadingIds.value, item.node.id])
  const requestedRevision = nodeRevision
  const loadOperation = Symbol(String(item.node.id))
  activeLoadOperations.set(item.node.id, loadOperation)
  const nextFailedIds = new Set(failedLoadIds.value)
  nextFailedIds.delete(item.node.id)
  failedLoadIds.value = nextFailedIds
  loadStatusMessage.value = `${loadingActionLabel.value}: ${item.node.label}`

  try {
    const children = await props.loadChildren!(item.node)
    if (
      !isMounted
      || requestedRevision !== nodeRevision
      || activeLoadOperations.get(item.node.id) !== loadOperation
    ) {
      return
    }
    const nextLoadedChildren = new Map(loadedChildren.value)
    nextLoadedChildren.set(item.node.id, children)
    loadedChildren.value = nextLoadedChildren
    if (children.length > 0)
      expandedIds.value = [...expandedIds.value, item.node.id]
    loadStatusMessage.value = ''
    emit('load', item.node, children)
  }
  catch (error: unknown) {
    if (
      !isMounted
      || requestedRevision !== nodeRevision
      || activeLoadOperations.get(item.node.id) !== loadOperation
    ) {
      return
    }
    failedLoadIds.value = new Set([...failedLoadIds.value, item.node.id])
    loadStatusMessage.value = `${retryLoadActionLabel.value}: ${item.node.label}`
    emit('loadError', item.node, error)
  }
  finally {
    if (activeLoadOperations.get(item.node.id) === loadOperation) {
      activeLoadOperations.delete(item.node.id)
      const nextLoadingIds = new Set(loadingIds.value)
      nextLoadingIds.delete(item.node.id)
      loadingIds.value = nextLoadingIds
    }
  }
}

function getExpansionLabel(item: VisibleTreeNode<TValue>): string {
  if (loadingIds.value.has(item.node.id))
    return `${loadingActionLabel.value}: ${item.node.label}`
  if (failedLoadIds.value.has(item.node.id))
    return `${retryLoadActionLabel.value}: ${item.node.label}`
  return `${expandedSet.value.has(item.node.id) ? collapseActionLabel.value : expandActionLabel.value}: ${item.node.label}`
}

function selectNode(item: VisibleTreeNode<TValue>): void {
  if (item.node.disabled)
    return

  activeId.value = item.node.id
  if (props.selectable)
    selectedId.value = item.node.id
  emit('select', item.node)
}

function setActiveNode(item: VisibleTreeNode<TValue>): void {
  activeId.value = item.node.id
}

function updateChecked(item: VisibleTreeNode<TValue>, value: boolean | 'indeterminate'): void {
  if (item.node.disabled)
    return

  const checkableIds = collectCheckableNodeIds(item.node)
  const nextCheckedIds = new Set(checkedIds.value)
  for (const id of checkableIds) {
    if (value === true)
      nextCheckedIds.add(id)
    else nextCheckedIds.delete(id)
  }

  checkedIds.value = [...nextCheckedIds]
  emit('check', item.node, value === true)
}

async function moveFocus(index: number, direction: 1 | -1 = 1): Promise<void> {
  let candidateIndex = index
  let item = visibleNodes.value[candidateIndex]
  while (item?.node.disabled) {
    candidateIndex += direction
    item = visibleNodes.value[candidateIndex]
  }
  if (!item)
    return

  activeId.value = item.node.id
  await nextTick()
  treeItemRefs.value.find(element => element.dataset.treeNodeId === item.node.id)?.focus()
}

function findParentIndex(index: number): number {
  const currentDepth = visibleNodes.value[index]?.depth
  if (currentDepth === undefined || currentDepth === 0)
    return index

  for (let candidateIndex = index - 1; candidateIndex >= 0; candidateIndex -= 1) {
    if (visibleNodes.value[candidateIndex]?.depth === currentDepth - 1)
      return candidateIndex
  }
  return index
}

function handleKeydown(event: KeyboardEvent, item: VisibleTreeNode<TValue>, index: number): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void moveFocus(index + 1, 1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    void moveFocus(index - 1, -1)
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    void moveFocus(0, 1)
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    void moveFocus(visibleNodes.value.length - 1, -1)
    return
  }
  if (event.key === 'ArrowRight' && item.hasChildren) {
    event.preventDefault()
    if (!expandedSet.value.has(item.node.id))
      void toggleExpanded(item)
    else void moveFocus(index + 1, 1)
    return
  }
  if (event.key === 'ArrowLeft' && item.hasChildren && expandedSet.value.has(item.node.id)) {
    event.preventDefault()
    void toggleExpanded(item)
    return
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    void moveFocus(findParentIndex(index))
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    selectNode(item)
    return
  }
  if (event.key === ' ' && props.checkable) {
    event.preventDefault()
    updateChecked(item, getCheckedState(item.node) !== true)
  }
}
</script>

<template>
  <div class="rounded-lg border border-border p-2" role="tree" :aria-label="treeLabel">
    <p class="sr-only" role="status" aria-live="polite">
      {{ loadStatusMessage }}
    </p>
    <slot v-if="visibleNodes.length === 0" name="empty">
      <p class="px-2 py-3 text-sm text-muted-foreground">
        {{ emptyStateLabel }}
      </p>
    </slot>
    <div
      v-for="(item, index) in visibleNodes"
      v-else
      :ref="treeItemRefs.set"
      :key="item.node.id"
      :data-tree-node-id="item.node.id"
      role="treeitem"
      :tabindex="activeId === item.node.id ? 0 : -1"
      :aria-level="item.depth + 1"
      :aria-expanded="item.hasChildren ? expandedSet.has(item.node.id) : undefined"
      :aria-selected="selectable ? selectedId === item.node.id : undefined"
      :aria-checked="checkable ? getAriaChecked(item.node) : undefined"
      :aria-disabled="item.node.disabled || undefined"
      :aria-busy="loadingIds.has(item.node.id) || undefined"
      class="flex min-h-8 items-center gap-1 rounded-md pr-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
      :class="[
        item.node.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent',
        selectedId === item.node.id ? 'bg-primary/10 text-primary' : '',
      ]"
      :style="{ paddingInlineStart: `${item.depth * 1.25 + 0.25}rem` }"
      @click="selectNode(item)"
      @focus="setActiveNode(item)"
      @keydown="handleKeydown($event, item, index)"
    >
      <Button
        v-if="item.hasChildren"
        type="button"
        variant="ghost"
        size="icon-sm"
        class="size-6 shrink-0"
        :aria-label="getExpansionLabel(item)"
        :title="getExpansionLabel(item)"
        :disabled="item.node.disabled || loadingIds.has(item.node.id)"
        @click.stop="void toggleExpanded(item)"
      >
        <LoaderCircle
          v-if="loadingIds.has(item.node.id)"
          class="size-4 animate-spin"
          aria-hidden="true"
        />
        <RotateCcw v-else-if="failedLoadIds.has(item.node.id)" class="size-4" aria-hidden="true" />
        <ChevronDown v-else-if="expandedSet.has(item.node.id)" class="size-4" aria-hidden="true" />
        <ChevronRight v-else class="size-4" aria-hidden="true" />
      </Button>
      <span v-else class="size-6 shrink-0" aria-hidden="true" />
      <Checkbox
        v-if="checkable"
        :model-value="getCheckedState(item.node)"
        :aria-label="`${checkActionLabel}: ${item.node.label}`"
        :disabled="item.node.disabled || collectCheckableNodeIds(item.node).length === 0"
        @click.stop
        @update:model-value="updateChecked(item, $event)"
      />
      <slot
        name="node"
        :node="item.node"
        :depth="item.depth"
        :is-selected="selectedId === item.node.id"
      >
        <span class="min-w-0 truncate">{{ item.node.label }}</span>
      </slot>
    </div>
  </div>
</template>
