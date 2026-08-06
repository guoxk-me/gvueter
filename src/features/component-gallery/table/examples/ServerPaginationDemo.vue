<script setup lang="ts">
import type { PaginationState, SortingState } from '@tanstack/vue-table'
import type { TableExamplesCopy, TableWorkOrder } from '../table-examples'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, ref, shallowRef, watch } from 'vue'
import { ProTable } from '@/components/pro-table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useTableUrlState } from '@/composables/use-table-url-state'
import { getTableExampleScenario, TABLE_WORK_ORDERS } from '../table-examples'
import TableExampleCard from '../TableExampleCard.vue'

interface ServerFilters extends Record<string, string> {
  keyword: string
  status: 'all' | TableWorkOrder['status']
}

interface ServerPageRequest {
  pageIndex: number
  pageSize: number
  keyword: string
  status: ServerFilters['status']
  sortBy: string
  sortOrder: 'asc' | 'desc' | 'none'
}

const props = defineProps<{
  copy: TableExamplesCopy
}>()

const columnHelper = createColumnHelper<TableWorkOrder>()
const scenario = getTableExampleScenario('server-pagination')
const pagination = shallowRef<PaginationState>({ pageIndex: 0, pageSize: 5 })
const sorting = shallowRef<SortingState>([])
const filters = ref<ServerFilters>({ keyword: '', status: 'all' })
const serverRows = shallowRef<TableWorkOrder[]>([])
const serverRowCount = shallowRef(TABLE_WORK_ORDERS.length)
const serverRequest = shallowRef<ServerPageRequest>({
  pageIndex: 0,
  pageSize: 5,
  keyword: '',
  status: 'all',
  sortBy: 'none',
  sortOrder: 'none',
})
const isLoading = shallowRef(true)
const canceledRequestCount = shallowRef(0)
const latestResponse = shallowRef('—')
let requestSequence = 0

const keyword = computed({
  get: () => filters.value.keyword,
  set: (nextKeyword: string) => {
    filters.value = { ...filters.value, keyword: nextKeyword }
    pagination.value = { ...pagination.value, pageIndex: 0 }
  },
})
const status = computed({
  get: () => filters.value.status,
  set: (nextStatus: ServerFilters['status']) => {
    filters.value = { ...filters.value, status: nextStatus }
    pagination.value = { ...pagination.value, pageIndex: 0 }
  },
})
const columns = computed(() => [
  columnHelper.accessor('id', {
    header: props.copy.columns.id,
    enableSorting: false,
    size: 130,
    meta: { label: props.copy.columns.id, textBehavior: 'nowrap', minWidth: 130 },
  }),
  columnHelper.accessor('title', {
    header: props.copy.columns.title,
    size: 280,
    meta: { label: props.copy.columns.title, textBehavior: 'wrap', minWidth: 240 },
  }),
  columnHelper.accessor('owner', {
    header: props.copy.columns.owner,
    size: 170,
    meta: { label: props.copy.columns.owner, textBehavior: 'nowrap', minWidth: 150 },
  }),
  columnHelper.accessor('status', {
    header: props.copy.columns.status,
    size: 120,
    meta: { label: props.copy.columns.status, textBehavior: 'nowrap', minWidth: 110 },
  }),
])

// AI modified: the Gallery uses the same allowlisted URL contract expected from a production server table.
useTableUrlState({
  filters,
  pagination,
  sorting,
  defaultFilters: { keyword: '', status: 'all' },
  defaultPagination: { pageIndex: 0, pageSize: 5 },
  defaultSorting: [],
  filterRules: {
    keyword: { queryKey: 'keyword' },
    status: { queryKey: 'status', acceptedValues: ['all', 'open', 'blocked', 'done'] },
  },
  pageSizeOptions: [5, 10, 20],
  sortColumnIds: ['title', 'owner', 'status'],
})

watch(
  [pagination, sorting, filters],
  ([nextPagination, nextSorting, nextFilters], _previousState, onCleanup) => {
    const requestId = ++requestSequence
    const activeSort = nextSorting[0]
    const request: ServerPageRequest = {
      ...nextPagination,
      keyword: nextFilters.keyword,
      status: nextFilters.status,
      sortBy: activeSort?.id ?? 'none',
      sortOrder: activeSort ? (activeSort.desc ? 'desc' : 'asc') : 'none',
    }
    const requestController = new AbortController()
    let hasSettled = false
    serverRequest.value = request
    isLoading.value = true

    // AI modified: abort plus request sequencing prevents stale simulated responses from replacing newer URL state.
    const responseTimer = globalThis.setTimeout(
      () => {
        if (requestController.signal.aborted || requestId !== requestSequence) return

        const keywordText = request.keyword.trim().toLowerCase()
        const matchingRows = TABLE_WORK_ORDERS.filter((row) => {
          const hasKeyword =
            keywordText.length === 0 ||
            row.title.toLowerCase().includes(keywordText) ||
            row.owner.toLowerCase().includes(keywordText)
          return hasKeyword && (request.status === 'all' || row.status === request.status)
        })
        if (activeSort) {
          matchingRows.sort((leftRow, rightRow) => {
            const leftText = String(leftRow[activeSort.id as 'title' | 'owner' | 'status'])
            const rightText = String(rightRow[activeSort.id as 'title' | 'owner' | 'status'])
            const direction = leftText.localeCompare(rightText)
            return activeSort.desc ? -direction : direction
          })
        }

        const startIndex = request.pageIndex * request.pageSize
        serverRows.value = matchingRows.slice(startIndex, startIndex + request.pageSize)
        serverRowCount.value = matchingRows.length
        latestResponse.value = `#${requestId} · ${serverRows.value.length}/${matchingRows.length}`
        isLoading.value = false
        hasSettled = true
      },
      requestId % 2 === 0 ? 90 : 180,
    )

    onCleanup(() => {
      globalThis.clearTimeout(responseTimer)
      if (!hasSettled) {
        requestController.abort()
        canceledRequestCount.value += 1
      }
    })
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <TableExampleCard :scenario="scenario" :copy="copy">
    <div
      class="grid min-w-0 gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[minmax(0,1fr)_12rem]"
    >
      <label class="min-w-0 space-y-1 text-xs font-medium text-foreground">
        <span>{{ copy.server.keyword }}</span>
        <Input v-model="keyword" type="search" data-testid="server-keyword" />
      </label>
      <label class="min-w-0 space-y-1 text-xs font-medium text-foreground">
        <span>{{ copy.server.status }}</span>
        <select
          v-model="status"
          class="h-9 w-full rounded-md border bg-background px-3 text-sm"
          data-testid="server-status"
        >
          <option value="all">{{ copy.server.allStatuses }}</option>
          <option value="open">{{ copy.status.open }}</option>
          <option value="blocked">{{ copy.status.blocked }}</option>
          <option value="done">{{ copy.status.done }}</option>
        </select>
      </label>
    </div>
    <div
      class="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs"
    >
      <span class="font-medium text-foreground">{{ copy.actions.request }}</span>
      <code class="min-w-0 break-all" data-testid="server-request">
        GET /api/work-orders?pageIndex={{ serverRequest.pageIndex }}&amp;pageSize={{
          serverRequest.pageSize
        }}&amp;keyword={{ serverRequest.keyword }}&amp;status={{
          serverRequest.status
        }}&amp;sortBy={{ serverRequest.sortBy }}&amp;sortOrder={{ serverRequest.sortOrder }}
      </code>
      <span data-testid="server-canceled"
        >{{ copy.server.canceledRequests }}: {{ canceledRequestCount }}</span
      >
      <span data-testid="server-latest-response"
        >{{ copy.server.latestResponse }}: {{ latestResponse }}</span
      >
    </div>
    <ProTable
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      :columns="columns"
      :data="serverRows"
      :labels="copy.tableLabels"
      :empty-message="copy.messages.noRows"
      :is-loading="isLoading"
      :row-count="serverRowCount"
      :page-size-options="[5, 10, 20]"
      manual-pagination
      manual-sorting
      manual-filtering
      :enable-column-controls="false"
      :enable-column-ordering="false"
      :enable-column-pinning="false"
      :enable-density="false"
      :enable-fullscreen="false"
      :get-row-id="(row) => row.id"
    >
      <template #cell="{ cell, row }">
        <Badge v-if="cell.column.id === 'status'" variant="outline">
          {{ copy.status[row.original.status] }}
        </Badge>
        <span v-else>{{ cell.getValue() }}</span>
      </template>
    </ProTable>
    <template #note>
      {{ copy.messages.requestHint }}
    </template>
  </TableExampleCard>
</template>
