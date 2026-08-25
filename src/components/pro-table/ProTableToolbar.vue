<script setup lang="ts" generic="TData extends RowData">
import type { Column, ColumnOrderState, RowData, Table as TanStackTable } from '@tanstack/vue-table'
import type { ProTableDensity, ProTableLabels } from './types'
import {
  ArrowDown,
  ArrowUp,
  Columns3Cog,
  Expand,
  GripVertical,
  Minimize,
  Pin,
  PinOff,
  Rows3,
} from '@lucide/vue'
import { nextTick, shallowRef } from 'vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const props = withDefaults(
  defineProps<{
    table: TanStackTable<TData>
    labels: ProTableLabels
    density: ProTableDensity
    columnOrder: ColumnOrderState
    isFullscreen: boolean
    enableColumnControls?: boolean
    enableDensity?: boolean
    enableFullscreen?: boolean
    enableColumnOrdering?: boolean
    enableColumnPinning?: boolean
  }>(),
  {
    enableColumnControls: true,
    enableDensity: true,
    enableFullscreen: true,
    enableColumnOrdering: true,
    enableColumnPinning: true,
  },
)

const emit = defineEmits<{
  densityChange: [density: ProTableDensity]
  fullscreenToggle: []
}>()

defineSlots<{
  leading?: () => unknown
  import?: () => unknown
  export?: () => unknown
  print?: () => unknown
}>()

const draggedColumnId = shallowRef<string>()
const columnOrderAnnouncement = shallowRef('')

const densityOptions: readonly { id: ProTableDensity, label: keyof ProTableLabels }[] = [
  { id: 'compact', label: 'densityCompact' },
  { id: 'standard', label: 'densityStandard' },
  { id: 'comfortable', label: 'densityComfortable' },
]

function getColumnLabel(column: Column<TData>): string {
  return column.columnDef.meta?.label ?? column.id
}

function updateColumnVisibility(column: Column<TData>, value: boolean | 'indeterminate'): void {
  column.toggleVisibility(value === true)
}

function startColumnDrag(columnId: string, event: DragEvent): void {
  draggedColumnId.value = columnId
  event.dataTransfer?.setData('text/plain', columnId)
  if (event.dataTransfer)
    event.dataTransfer.effectAllowed = 'move'
}

function getOrderedColumnIds(): string[] {
  const allColumnIds = props.table.getAllLeafColumns().map(column => column.id)
  const orderedKnownIds = props.columnOrder.filter(columnId => allColumnIds.includes(columnId))
  return [
    ...orderedKnownIds,
    ...allColumnIds.filter(columnId => !orderedKnownIds.includes(columnId)),
  ]
}

function announceColumnPosition(columnId: string, orderedColumnIds: readonly string[]): void {
  const column = props.table.getColumn(columnId)
  if (!column)
    return

  const announcement = props.labels.columnMoved
    .replace('{column}', getColumnLabel(column))
    .replace('{position}', String(orderedColumnIds.indexOf(columnId) + 1))
    .replace('{total}', String(orderedColumnIds.length))
  columnOrderAnnouncement.value = ''
  void nextTick(() => {
    columnOrderAnnouncement.value = announcement
  })
}

function setColumnPosition(sourceColumnId: string, targetIndex: number): void {
  const nextOrder = getOrderedColumnIds()
  const sourceIndex = nextOrder.indexOf(sourceColumnId)
  const safeTargetIndex = Math.min(Math.max(targetIndex, 0), nextOrder.length - 1)
  if (sourceIndex < 0 || sourceIndex === safeTargetIndex)
    return

  // AI modified: pointer and keyboard ordering share one state transition and live announcement.
  nextOrder.splice(sourceIndex, 1)
  nextOrder.splice(safeTargetIndex, 0, sourceColumnId)
  props.table.setColumnOrder(nextOrder)
  announceColumnPosition(sourceColumnId, nextOrder)
}

function canMoveColumn(columnId: string, offset: -1 | 1): boolean {
  const orderedColumnIds = getOrderedColumnIds()
  const columnIndex = orderedColumnIds.indexOf(columnId)
  const targetIndex = columnIndex + offset
  return columnIndex >= 0 && targetIndex >= 0 && targetIndex < orderedColumnIds.length
}

function moveColumn(columnId: string, offset: -1 | 1): void {
  const columnIndex = getOrderedColumnIds().indexOf(columnId)
  if (columnIndex < 0)
    return
  setColumnPosition(columnId, columnIndex + offset)
}

function reorderColumn(targetColumnId: string): void {
  const sourceColumnId = draggedColumnId.value
  draggedColumnId.value = undefined
  if (!sourceColumnId || sourceColumnId === targetColumnId)
    return

  const targetIndex = getOrderedColumnIds().indexOf(targetColumnId)
  if (targetIndex < 0)
    return
  setColumnPosition(sourceColumnId, targetIndex)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <slot name="leading" />
      <slot name="import" />
      <slot name="export" />
      <slot name="print" />
    </div>

    <div class="flex shrink-0 items-center gap-1">
      <DropdownMenu v-if="enableDensity">
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="icon-sm" :aria-label="labels.density">
            <Rows3 class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{{ labels.density }}</DropdownMenuLabel>
          <DropdownMenuItem
            v-for="option in densityOptions"
            :key="option.id"
            :class="{ 'bg-accent': density === option.id }"
            @click="emit('densityChange', option.id)"
          >
            {{ labels[option.label] }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu v-if="enableColumnControls">
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="icon-sm" :aria-label="labels.columns">
            <Columns3Cog class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-72">
          <DropdownMenuLabel>{{ labels.columns }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div
            v-for="column in table.getAllLeafColumns()"
            :key="column.id"
            :draggable="enableColumnOrdering"
            class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            @dragstart="startColumnDrag(column.id, $event)"
            @dragend="draggedColumnId = undefined"
            @dragover.prevent
            @drop.prevent="reorderColumn(column.id)"
          >
            <GripVertical
              v-if="enableColumnOrdering"
              class="size-4 shrink-0 cursor-grab text-muted-foreground"
              aria-hidden="true"
            />
            <Checkbox
              :model-value="column.getIsVisible()"
              :disabled="!column.getCanHide()"
              :aria-label="getColumnLabel(column)"
              @update:model-value="updateColumnVisibility(column, $event)"
            />
            <span class="min-w-0 flex-1 truncate">{{ getColumnLabel(column) }}</span>
            <div v-if="enableColumnOrdering" class="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="size-7"
                :disabled="!canMoveColumn(column.id, -1)"
                :aria-label="`${labels.moveColumnUp}: ${getColumnLabel(column)}`"
                @click.stop="moveColumn(column.id, -1)"
              >
                <ArrowUp class="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                class="size-7"
                :disabled="!canMoveColumn(column.id, 1)"
                :aria-label="`${labels.moveColumnDown}: ${getColumnLabel(column)}`"
                @click.stop="moveColumn(column.id, 1)"
              >
                <ArrowDown class="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            <div v-if="enableColumnPinning && column.getCanPin()" class="flex items-center gap-0.5">
              <button
                type="button"
                class="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                :title="labels.pinLeft"
                :aria-label="`${labels.pinLeft}: ${getColumnLabel(column)}`"
                @click.stop="column.pin('left')"
              >
                <Pin class="size-3.5 -rotate-45" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                :title="labels.pinRight"
                :aria-label="`${labels.pinRight}: ${getColumnLabel(column)}`"
                @click.stop="column.pin('right')"
              >
                <Pin class="size-3.5 rotate-45" aria-hidden="true" />
              </button>
              <button
                v-if="column.getIsPinned()"
                type="button"
                class="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                :title="labels.unpin"
                :aria-label="`${labels.unpin}: ${getColumnLabel(column)}`"
                @click.stop="column.pin(false)"
              >
                <PinOff class="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        v-if="enableFullscreen"
        type="button"
        variant="ghost"
        size="icon-sm"
        :aria-label="isFullscreen ? labels.exitFullscreen : labels.fullscreen"
        @click="emit('fullscreenToggle')"
      >
        <Minimize v-if="isFullscreen" class="size-4" aria-hidden="true" />
        <Expand v-else class="size-4" aria-hidden="true" />
      </Button>
    </div>
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{ columnOrderAnnouncement }}
    </p>
  </div>
</template>
