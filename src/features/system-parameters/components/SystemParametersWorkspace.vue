<script setup lang="ts">
import type {
  SystemParameterInput,
  SystemParameterListFilters,
  SystemParameterRecord,
} from '../types'
import type { SearchFormField } from '@/components/admin'
import { ArrowLeft, Plus } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { Callout, PageHeader, SearchForm } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { canAccess } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import { useSystemParameterManagement } from '../composables/useSystemParameterManagement'
import { SYSTEM_PARAMETER_STATUSES } from '../types'
import SystemParameterFormDialog from './SystemParameterFormDialog.vue'
import SystemParametersTable from './SystemParametersTable.vue'

const { t } = useI18n()
const defaultFilters: SystemParameterListFilters = { keyword: '', status: 'all' }
const searchFilters = shallowRef<SystemParameterListFilters>({ ...defaultFilters })
const appliedFilters = shallowRef<SystemParameterListFilters>({ ...defaultFilters })
const isFormOpen = shallowRef(false)
const selectedParameter = shallowRef<SystemParameterRecord>()
const canCreate = computed(() => canAccess('create', 'Settings'))
const canUpdate = computed(() => canAccess('update', 'Settings'))
const canDelete = computed(() => canAccess('delete', 'Settings'))
const canManage = computed(() => canCreate.value || canUpdate.value || canDelete.value)
const filterFields = computed<readonly SearchFormField<SystemParameterListFilters>[]>(() => [
  {
    name: 'keyword',
    type: 'search',
    label: t('systemParameters.search'),
    placeholder: t('systemParameters.search'),
    inputMode: 'search',
  },
  {
    name: 'status',
    type: 'select',
    label: t('systemParameters.status'),
    options: [
      { label: t('systemParameters.allStatuses'), value: 'all' },
      ...SYSTEM_PARAMETER_STATUSES.map((status) => ({
        label: t(`systemParameters.${status}`),
        value: status,
      })),
    ],
  },
])
const {
  parameters,
  total,
  queryError,
  isLoading,
  isSaving,
  isDeleting,
  saveParameter,
  deleteParameter,
} = useSystemParameterManagement(appliedFilters)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function createParameter(): void {
  selectedParameter.value = undefined
  isFormOpen.value = true
}

function editParameter(parameter: SystemParameterRecord): void {
  selectedParameter.value = parameter
  isFormOpen.value = true
}

function applyFilters(filters: SystemParameterListFilters): void {
  // AI modified: submitted filter snapshots prevent one server request per edited character.
  appliedFilters.value = { ...filters }
}

async function save(input: SystemParameterInput): Promise<void> {
  try {
    await saveParameter({ parameter: selectedParameter.value, input })
    isFormOpen.value = false
    toast.success(t('systemParameters.saveSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function remove(parameter: SystemParameterRecord): Promise<void> {
  try {
    await deleteParameter(parameter)
    toast.success(t('systemParameters.deleteSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader
      :title="t('systemParameters.title')"
      :description="t('systemParameters.description')"
    >
      <template #actions>
        <Button as-child variant="outline">
          <RouterLink to="/system-config">
            <ArrowLeft class="size-4" aria-hidden="true" />
            {{ t('systemParameters.backToConfig') }}
          </RouterLink>
        </Button>
        <Button v-if="canCreate" type="button" @click="createParameter">
          <Plus class="size-4" aria-hidden="true" />
          {{ t('systemParameters.create') }}
        </Button>
      </template>
    </PageHeader>

    <Callout
      v-if="!canManage"
      :title="t('systemParameters.readOnlyTitle')"
      :description="t('systemParameters.readOnlyDescription')"
    />

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
        {{ t('systemParameters.total', { total }) }}
      </template>
    </SearchForm>

    <div
      v-if="queryError"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      role="alert"
    >
      {{ getErrorMessage(queryError) }}
    </div>

    <SystemParametersTable
      :parameters="parameters"
      :is-loading="isLoading"
      :is-deleting="isDeleting"
      :can-update="canUpdate"
      :can-delete="canDelete"
      @edit="editParameter"
      @delete="remove"
    />
    <SystemParameterFormDialog
      v-model:open="isFormOpen"
      :parameter="selectedParameter"
      :is-saving="isSaving"
      @save="save"
    />
  </section>
</template>
