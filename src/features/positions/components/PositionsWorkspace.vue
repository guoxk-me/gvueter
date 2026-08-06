<script setup lang="ts">
import type { PositionInput, PositionListFilters, PositionRecord } from '@/features/positions/types'
import { Plus, Search } from '@lucide/vue'
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePositionManagement } from '@/features/positions/composables/usePositionManagement'
import { POSITION_STATUSES } from '@/features/positions/types'
import { appAbility } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import PositionFormDialog from './PositionFormDialog.vue'
import PositionsTable from './PositionsTable.vue'

const { t } = useI18n()
const filters = ref<PositionListFilters>({ keyword: '', status: 'all' })
const isFormOpen = shallowRef(false)
const selectedPosition = shallowRef<PositionRecord>()
const canManage = computed(() => appAbility.can('update', 'Settings'))
const {
  positions,
  total,
  queryError,
  isLoading,
  isSaving,
  isDeleting,
  savePosition,
  deletePosition,
} = usePositionManagement(filters)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function createPosition(): void {
  selectedPosition.value = undefined
  isFormOpen.value = true
}

function editPosition(position: PositionRecord): void {
  selectedPosition.value = position
  isFormOpen.value = true
}

async function save(input: PositionInput): Promise<void> {
  try {
    await savePosition({ position: selectedPosition.value, input })
    isFormOpen.value = false
    toast.success(t('positions.saveSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function remove(position: PositionRecord): Promise<void> {
  try {
    await deletePosition(position)
    toast.success(t('positions.deleteSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('positions.title')" :description="t('positions.description')">
      <template #actions>
        <Button v-if="canManage" type="button" @click="createPosition">
          <Plus class="size-4" aria-hidden="true" />
          {{ t('positions.create') }}
        </Button>
      </template>
    </PageHeader>

    <div
      class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
    >
      <label class="relative min-w-0 flex-1">
        <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
        <span class="sr-only">{{ t('positions.search') }}</span>
        <Input v-model="filters.keyword" class="pl-9" :placeholder="t('positions.search')" />
      </label>
      <Select v-model="filters.status">
        <!-- AI modified: the standalone status trigger needs a stable accessible name outside FormField. -->
        <SelectTrigger class="w-full sm:w-44" :aria-label="t('positions.status')">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('positions.allStatuses') }}
          </SelectItem>
          <SelectItem v-for="status in POSITION_STATUSES" :key="status" :value="status">
            {{ t(`positions.${status}`) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <span class="text-xs text-muted-foreground">{{ t('positions.total', { total }) }}</span>
    </div>

    <!-- AI modified: async query failures are announced when they enter the DOM. -->
    <div
      v-if="queryError"
      role="alert"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ getErrorMessage(queryError) }}
    </div>

    <PositionsTable
      :positions="positions"
      :is-loading="isLoading"
      :is-deleting="isDeleting"
      :can-manage="canManage"
      @edit="editPosition"
      @delete="remove"
    />
    <PositionFormDialog
      v-model:open="isFormOpen"
      :position="selectedPosition"
      :is-saving="isSaving"
      @save="save"
    />
  </section>
</template>
