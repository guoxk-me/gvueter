<script setup lang="ts">
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import type { ProTableEditCommit } from '@/components/pro-table'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, onUnmounted, shallowRef } from 'vue'
import { ProTable } from '@/components/pro-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

interface RowEditDraft {
  rowId: string
  title: string
  owner: string
}

interface RowEditErrors {
  title?: string
  owner?: string
}

type EditSaveState = 'idle' | 'saving' | 'saved' | 'failed'

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('editable')
const rows = shallowRef<TableWorkOrder[]>(freshRows())
const rowEditDraft = shallowRef<RowEditDraft>()
const rowEditErrors = shallowRef<RowEditErrors>({})
const lastEdit = shallowRef('')
const saveState = shallowRef<EditSaveState>('idle')
const tableRevision = shallowRef(0)
let saveSequence = 0
let saveTimer: ReturnType<typeof globalThis.setTimeout> | undefined
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    size: 130,
    meta: { label: props.copy.columns.id, textBehavior: 'nowrap', minWidth: 130 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    size: 300,
    meta: { label: props.copy.columns.title, editable: true, textBehavior: 'wrap', minWidth: 260 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    size: 180,
    meta: {
      label: props.copy.columns.owner,
      editable: true,
      textBehavior: 'nowrap',
      minWidth: 160,
    },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    size: 120,
    meta: { label: props.copy.columns.status, textBehavior: 'nowrap', minWidth: 110 },
  }),
])
const saveStateMessage = computed(() => {
  if (saveState.value === 'saving') return props.copy.editing.saving
  if (saveState.value === 'saved') return props.copy.editing.saved
  if (saveState.value === 'failed') return props.copy.editing.failedRollback
  return props.copy.editing.failureHint
})

function freshRows(): TableWorkOrder[] {
  return TABLE_WORK_ORDERS.slice(0, 5).map((row) => ({ ...row }))
}

function getRowEditErrors(title: string, owner: string): RowEditErrors {
  const nextErrors: RowEditErrors = {}
  if (title.trim().length < 5) nextErrors.title = props.copy.editing.titleRequired
  if (owner.trim().length < 2) nextErrors.owner = props.copy.editing.ownerRequired
  return nextErrors
}

function saveOptimisticRows(
  previousRows: TableWorkOrder[],
  changedRow: TableWorkOrder,
  editDescription: string,
): void {
  saveSequence += 1
  const activeSave = saveSequence
  if (saveTimer) globalThis.clearTimeout(saveTimer)
  saveState.value = 'saving'
  lastEdit.value = editDescription

  // AI modified: deterministic optimistic mutation and rollback make server-failure ownership explicit in the Gallery.
  saveTimer = globalThis.setTimeout(() => {
    if (activeSave !== saveSequence) return
    if (changedRow.title.toLowerCase().includes('[fail]')) {
      rows.value = previousRows
      saveState.value = 'failed'
      return
    }
    saveState.value = 'saved'
  }, 160)
}

function commitEdit(change: ProTableEditCommit<TableWorkOrder>): void {
  if (change.columnId !== 'title' && change.columnId !== 'owner') return

  const changedText = change.value.trim()
  const changedRow = rows.value.find((row) => row.id === change.rowId)
  if (!changedRow) return

  const nextTitle = change.columnId === 'title' ? changedText : changedRow.title
  const nextOwner = change.columnId === 'owner' ? changedText : changedRow.owner
  const nextErrors = getRowEditErrors(nextTitle, nextOwner)
  rowEditErrors.value = nextErrors
  if (Object.keys(nextErrors).length > 0) return

  const previousRows = rows.value.map((row) => ({ ...row }))
  const nextRow: TableWorkOrder = { ...changedRow, title: nextTitle, owner: nextOwner }
  rows.value = rows.value.map((row) => (row.id === change.rowId ? nextRow : row))
  saveOptimisticRows(previousRows, nextRow, `${change.rowId}.${change.columnId} = ${changedText}`)
}

function beginRowEdit(): void {
  const firstRow = rows.value[0]
  if (!firstRow) return
  rowEditDraft.value = { rowId: firstRow.id, title: firstRow.title, owner: firstRow.owner }
  rowEditErrors.value = {}
}

function updateRowDraft(field: 'title' | 'owner', nextValue: string | number): void {
  if (!rowEditDraft.value) return
  rowEditDraft.value = { ...rowEditDraft.value, [field]: String(nextValue) }
}

function saveRowEdit(): void {
  const draft = rowEditDraft.value
  if (!draft) return
  const nextErrors = getRowEditErrors(draft.title, draft.owner)
  rowEditErrors.value = nextErrors
  if (Object.keys(nextErrors).length > 0) return

  const changedRow = rows.value.find((row) => row.id === draft.rowId)
  if (!changedRow) return
  const previousRows = rows.value.map((row) => ({ ...row }))
  const nextRow: TableWorkOrder = {
    ...changedRow,
    title: draft.title.trim(),
    owner: draft.owner.trim(),
  }
  rows.value = rows.value.map((row) => (row.id === draft.rowId ? nextRow : row))
  rowEditDraft.value = undefined
  saveOptimisticRows(
    previousRows,
    nextRow,
    `${draft.rowId}.row = ${nextRow.title} / ${nextRow.owner}`,
  )
}

function refreshRows(): void {
  saveSequence += 1
  if (saveTimer) globalThis.clearTimeout(saveTimer)
  rows.value = freshRows()
  rowEditDraft.value = undefined
  rowEditErrors.value = {}
  lastEdit.value = ''
  saveState.value = 'idle'
  tableRevision.value += 1
  // AI modified: remounting the controlled table clears any open cell editor when authoritative rows refresh.
}

onUnmounted(() => {
  if (saveTimer) globalThis.clearTimeout(saveTimer)
})
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="begin-row-edit"
        @click="beginRowEdit"
      >
        {{ copy.editing.editRow }}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="refresh-editable"
        @click="refreshRows"
      >
        {{ copy.editing.refresh }}
      </Button>
      <span class="text-sm text-muted-foreground" role="status" data-testid="edit-save-state">
        {{ saveStateMessage }}
      </span>
    </div>

    <form
      v-if="rowEditDraft"
      class="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2"
      data-testid="row-editor"
      @submit.prevent="saveRowEdit"
    >
      <label class="space-y-1 text-sm">
        <span>{{ copy.columns.title }}</span>
        <Input
          :model-value="rowEditDraft.title"
          :aria-invalid="Boolean(rowEditErrors.title)"
          data-testid="row-edit-title"
          @update:model-value="updateRowDraft('title', $event)"
        />
        <span v-if="rowEditErrors.title" class="text-xs text-destructive" role="alert">{{
          rowEditErrors.title
        }}</span>
      </label>
      <label class="space-y-1 text-sm">
        <span>{{ copy.columns.owner }}</span>
        <Input
          :model-value="rowEditDraft.owner"
          :aria-invalid="Boolean(rowEditErrors.owner)"
          data-testid="row-edit-owner"
          @update:model-value="updateRowDraft('owner', $event)"
        />
        <span v-if="rowEditErrors.owner" class="text-xs text-destructive" role="alert">{{
          rowEditErrors.owner
        }}</span>
      </label>
      <div class="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" size="sm" data-testid="save-row-edit">
          {{ copy.editing.save }}
        </Button>
        <Button type="button" size="sm" variant="ghost" @click="rowEditDraft = undefined">
          {{ copy.editing.cancel }}
        </Button>
      </div>
    </form>

    <p class="text-sm text-muted-foreground" role="status" data-testid="last-edit">
      {{ copy.actions.lastEdit }}: {{ lastEdit || copy.actions.noEdit }}
    </p>
    <ProTable
      :key="tableRevision"
      :columns="columns"
      :data="rows"
      :labels="copy.tableLabels"
      :empty-message="copy.messages.noRows"
      :page-size-options="[5, 10]"
      :enable-column-controls="false"
      :enable-column-ordering="false"
      :enable-column-pinning="false"
      :enable-density="false"
      :enable-fullscreen="false"
      :get-row-id="(row) => row.id"
      @edit-commit="commitEdit"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </ProTable>
    <template #note> {{ copy.messages.editHint }} {{ copy.editing.failureHint }} </template>
  </TableExampleCard>
</template>
