<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { DetailDescriptionItem } from '@/components/admin'
import type {
  OperationLogFilters,
  OperationLogRecord,
} from '@/features/content-admin/types/operation-logs'
import { parseDate } from '@internationalized/date'
import { CalendarDays, Eye, RotateCcw, Search } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DetailDescriptions, Drawer, Pagination, StatusTag } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useOperationLogs } from '@/features/content-admin/composables/useOperationLogs'
import { OPERATION_LOG_OUTCOMES } from '@/features/content-admin/types/operation-logs'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { ApiError } from '@/lib/http'

const props = withDefaults(defineProps<{ showHeader?: boolean }>(), { showHeader: true })
const emit = defineEmits<{
  operationLogOptionsReady: [operationLogIds: readonly string[]]
}>()
const { locale, t } = useI18n()
const filters = ref<OperationLogFilters>({
  startDate: '',
  endDate: '',
  actor: '',
  action: '',
  resource: '',
  outcome: 'all',
  page: 1,
  pageSize: 10,
})
const selectedOperationLogId = defineModel<string | undefined>('selectedOperationLogId')
const {
  operationLogs,
  total,
  selectedOperationLog,
  queryError,
  detailError,
  isLoading,
  isLoadingDetail,
} = useOperationLogs(filters, selectedOperationLogId)
const isDetailOpen = computed({
  get: () => Boolean(selectedOperationLogId.value),
  set: (isOpen: boolean) => {
    if (!isOpen) selectedOperationLogId.value = undefined
  },
})

function parseDateValue(value: string): DateValue | undefined {
  if (!value) return undefined

  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const startDateModel = computed({
  get: () => parseDateValue(filters.value.startDate),
  set: (value: DateValue | undefined) => {
    filters.value.startDate = value ? value.toString() : ''
    filters.value.page = 1
  },
})
const endDateModel = computed({
  get: () => parseDateValue(filters.value.endDate),
  set: (value: DateValue | undefined) => {
    filters.value.endDate = value ? value.toString() : ''
    filters.value.page = 1
  },
})

const isStartDatePickerOpen = ref(false)
const isEndDatePickerOpen = ref(false)

watch(
  [operationLogs, isLoading],
  ([availableOperationLogs, isQueryLoading]) => {
    if (!isQueryLoading) {
      // AI modified: the route owner receives server-provided IDs instead of accepting arbitrary detail keys.
      emit(
        'operationLogOptionsReady',
        availableOperationLogs.map((operationLog) => operationLog.id),
      )
    }
  },
  { immediate: true },
)

function getOperationOccurredAt(timestamp: string): string {
  // AI modified: list and detail timestamps share the same locale-aware projection.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const detailItems = computed<DetailDescriptionItem[]>(() =>
  selectedOperationLog.value
    ? [
        {
          key: 'occurredAt',
          label: t('contentAdmin.logs.fields.occurredAt'),
          value: getOperationOccurredAt(selectedOperationLog.value.occurredAt),
        },
        {
          key: 'actor',
          label: t('contentAdmin.logs.fields.actor'),
          value: selectedOperationLog.value.actorName,
        },
        {
          key: 'email',
          label: t('contentAdmin.logs.fields.email'),
          value: selectedOperationLog.value.actorEmailMasked,
        },
        {
          key: 'ip',
          label: t('contentAdmin.logs.fields.ip'),
          value: selectedOperationLog.value.ipMasked,
        },
        {
          key: 'action',
          label: t('contentAdmin.logs.fields.action'),
          value: selectedOperationLog.value.action,
        },
        {
          key: 'resource',
          label: t('contentAdmin.logs.fields.resource'),
          value: selectedOperationLog.value.resource,
        },
        {
          key: 'outcome',
          label: t('contentAdmin.logs.fields.outcome'),
          value: t(`contentAdmin.logs.outcomes.${selectedOperationLog.value.outcome}`),
          tone: selectedOperationLog.value.outcome === 'success' ? 'success' : 'destructive',
        },
        {
          key: 'summary',
          label: t('contentAdmin.logs.fields.summary'),
          value: selectedOperationLog.value.summary,
          span: 2,
        },
      ]
    : [],
)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function updateFilter(
  field: keyof Pick<OperationLogFilters, 'actor' | 'action' | 'resource'>,
  value: string | number,
): void {
  filters.value[field] = String(value)
  filters.value.page = 1
}

function showDetail(operationLog: OperationLogRecord): void {
  selectedOperationLogId.value = operationLog.id
}

function resetFilters(): void {
  // AI modified: reset server filters and pagination as one business operation.
  filters.value = {
    startDate: '',
    endDate: '',
    actor: '',
    action: '',
    resource: '',
    outcome: 'all',
    page: 1,
    pageSize: filters.value.pageSize,
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- AI modified: a standalone route owns its H1 while the embedded tab retains this section header. -->
    <div v-if="props.showHeader">
      <h2 class="font-semibold">
        {{ t('contentAdmin.logs.title') }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{ t('contentAdmin.logs.description') }}
      </p>
    </div>

    <div class="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label class="space-y-1.5 text-sm">
        <span>{{ t('contentAdmin.logs.filters.startDate') }}</span>
        <Popover v-model:open="isStartDatePickerOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="w-full justify-start text-left font-normal"
              :aria-label="t('contentAdmin.logs.filters.startDate')"
            >
              <CalendarDays class="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
              <span
                class="truncate"
                :class="filters.startDate ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ filters.startDate || t('contentAdmin.logs.filters.startDate') }}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0">
            <!-- AI modified: keep date filtering in one click path with shadcn Calendar popover. -->
            <Calendar
              v-model="startDateModel"
              class="rounded-lg"
              @update:model-value="isStartDatePickerOpen = false"
            />
          </PopoverContent>
        </Popover>
      </label>
      <label class="space-y-1.5 text-sm">
        <span>{{ t('contentAdmin.logs.filters.endDate') }}</span>
        <!-- AI modified: keep end-date filter updates in sync with start-date picker behavior. -->
        <Popover v-model:open="isEndDatePickerOpen">
          <PopoverTrigger as-child>
            <Button
              type="button"
              variant="outline"
              class="w-full justify-start text-left font-normal"
              :aria-label="t('contentAdmin.logs.filters.endDate')"
            >
              <CalendarDays class="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
              <span
                class="truncate"
                :class="filters.endDate ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ filters.endDate || t('contentAdmin.logs.filters.endDate') }}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0">
            <Calendar
              v-model="endDateModel"
              class="rounded-lg"
              @update:model-value="isEndDatePickerOpen = false"
            />
          </PopoverContent>
        </Popover>
      </label>
      <label class="relative space-y-1.5 text-sm">
        <span>{{ t('contentAdmin.logs.filters.actor') }}</span>
        <div class="relative">
          <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            :model-value="filters.actor"
            class="pl-9"
            @update:model-value="updateFilter('actor', $event)"
          />
        </div>
      </label>
      <label class="space-y-1.5 text-sm">
        <span>{{ t('contentAdmin.logs.filters.outcome') }}</span>
        <Select v-model="filters.outcome" @update:model-value="filters.page = 1">
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{{ t('contentAdmin.logs.outcomes.all') }}</SelectItem>
            <SelectItem v-for="outcome in OPERATION_LOG_OUTCOMES" :key="outcome" :value="outcome">
              {{ t(`contentAdmin.logs.outcomes.${outcome}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label class="space-y-1.5 text-sm">
        <span>{{ t('contentAdmin.logs.filters.action') }}</span>
        <Input :model-value="filters.action" @update:model-value="updateFilter('action', $event)" />
      </label>
      <label class="space-y-1.5 text-sm">
        <span>{{ t('contentAdmin.logs.filters.resource') }}</span>
        <Input
          :model-value="filters.resource"
          @update:model-value="updateFilter('resource', $event)"
        />
      </label>
      <div class="flex items-end sm:col-span-2">
        <Button type="button" variant="outline" @click="resetFilters">
          <RotateCcw class="size-4" aria-hidden="true" />
          {{ t('common.reset') }}
        </Button>
      </div>
    </div>

    <p
      v-if="queryError"
      class="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
      role="alert"
    >
      {{ getErrorMessage(queryError) }}
    </p>
    <div class="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('contentAdmin.logs.fields.occurredAt') }}</TableHead>
            <TableHead>{{ t('contentAdmin.logs.fields.actor') }}</TableHead>
            <TableHead>{{ t('contentAdmin.logs.fields.action') }}</TableHead>
            <TableHead>{{ t('contentAdmin.logs.fields.resource') }}</TableHead>
            <TableHead>{{ t('contentAdmin.logs.fields.outcome') }}</TableHead>
            <TableHead class="text-right">
              {{ t('common.actions') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="index in 4" :key="index">
              <TableCell v-for="column in 6" :key="column">
                <Skeleton class="h-5" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="operationLogs.length">
            <TableRow v-for="operationLog in operationLogs" :key="operationLog.id">
              <TableCell class="text-sm text-muted-foreground">
                {{ getOperationOccurredAt(operationLog.occurredAt) }}
              </TableCell>
              <TableCell>
                <p class="font-medium">
                  {{ operationLog.actorName }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ operationLog.actorEmailMasked }}
                </p>
              </TableCell>
              <TableCell
                ><code class="text-xs">{{ operationLog.action }}</code></TableCell
              >
              <TableCell>{{ operationLog.resource }}</TableCell>
              <TableCell>
                <StatusTag
                  :label="t(`contentAdmin.logs.outcomes.${operationLog.outcome}`)"
                  :tone="operationLog.outcome === 'success' ? 'success' : 'destructive'"
                />
              </TableCell>
              <TableCell class="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="t('contentAdmin.logs.viewDetail')"
                  @click="showDetail(operationLog)"
                >
                  <Eye class="size-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell :colspan="6" class="h-24 text-center text-muted-foreground">
              {{ t('contentAdmin.logs.empty') }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <Pagination v-model:page="filters.page" v-model:page-size="filters.pageSize" :total="total" />

    <Drawer
      v-model:open="isDetailOpen"
      :title="t('contentAdmin.logs.detailTitle')"
      :description="t('contentAdmin.logs.detailDescription')"
      size="lg"
    >
      <div class="space-y-4">
        <Skeleton v-if="isLoadingDetail" class="h-64 w-full" />
        <p v-else-if="detailError" class="text-sm text-destructive" role="alert">
          {{ getErrorMessage(detailError) }}
        </p>
        <DetailDescriptions v-else :items="detailItems" />
        <p class="text-xs text-muted-foreground">
          {{ t('contentAdmin.logs.redactionNotice') }}
        </p>
      </div>
    </Drawer>
  </div>
</template>
