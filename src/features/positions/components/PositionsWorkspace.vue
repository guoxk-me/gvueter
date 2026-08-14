<script setup lang="ts">
import type { SearchFormField } from '@/components/admin'
import type { PositionInput, PositionListFilters, PositionRecord } from '@/features/positions/types'
import { Plus } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { PageHeader, SearchForm } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { usePositionManagement } from '@/features/positions/composables/usePositionManagement'
import { POSITION_STATUSES } from '@/features/positions/types'
import { appAbility } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import PositionFormDialog from './PositionFormDialog.vue'
import PositionsTable from './PositionsTable.vue'

const { t } = useI18n()
const defaultFilters: PositionListFilters = { keyword: '', status: 'all' }
const searchFilters = shallowRef<PositionListFilters>({ ...defaultFilters })
const appliedFilters = shallowRef<PositionListFilters>({ ...defaultFilters })
const isFormOpen = shallowRef(false)
const selectedPosition = shallowRef<PositionRecord>()
const canManage = computed(() => appAbility.can('update', 'Settings'))
const filterFields = computed<readonly SearchFormField<PositionListFilters>[]>(() => [
  {
    name: 'keyword',
    type: 'search',
    label: t('positions.search'),
    placeholder: t('positions.search'),
    inputMode: 'search',
  },
  {
    name: 'status',
    type: 'select',
    label: t('positions.status'),
    options: [
      { label: t('positions.allStatuses'), value: 'all' },
      ...POSITION_STATUSES.map((status) => ({ label: t(`positions.${status}`), value: status })),
    ],
  },
])
const {
  positions,
  total,
  queryError,
  isLoading,
  isSaving,
  isDeleting,
  savePosition,
  deletePosition,
} = usePositionManagement(appliedFilters)

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

function applyFilters(filters: PositionListFilters): void {
  // AI modified: only submitted snapshots become query keys, avoiding a request for every keystroke.
  appliedFilters.value = { ...filters }
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

    <SearchForm
      v-model="searchFilters"
      :fields="filterFields"
      :default-values="defaultFilters"
      :search-label="t('common.search')"
      :reset-label="t('common.reset')"
      :is-searching="isLoading"
      @search="applyFilters"
      @reset="applyFilters"
    >
      <template #summary>
        {{ t('positions.total', { total }) }}
      </template>
    </SearchForm>

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
