<script setup lang="ts">
import type {
  SystemParameterInput,
  SystemParameterListFilters,
  SystemParameterRecord,
} from '../types'
import { ArrowLeft, Plus, Search } from '@lucide/vue'
import { computed, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { Callout, PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { canAccess } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import { useSystemParameterManagement } from '../composables/useSystemParameterManagement'
import { SYSTEM_PARAMETER_STATUSES } from '../types'
import SystemParameterFormDialog from './SystemParameterFormDialog.vue'
import SystemParametersTable from './SystemParametersTable.vue'

const { t } = useI18n()
const filters = ref<SystemParameterListFilters>({ keyword: '', status: 'all' })
const isFormOpen = shallowRef(false)
const selectedParameter = shallowRef<SystemParameterRecord>()
const canCreate = computed(() => canAccess('create', 'Settings'))
const canUpdate = computed(() => canAccess('update', 'Settings'))
const canDelete = computed(() => canAccess('delete', 'Settings'))
const canManage = computed(() => canCreate.value || canUpdate.value || canDelete.value)
const {
  parameters,
  total,
  queryError,
  isLoading,
  isSaving,
  isDeleting,
  saveParameter,
  deleteParameter,
} = useSystemParameterManagement(filters)

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

    <div
      class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center"
    >
      <label class="relative min-w-0 flex-1">
        <Search class="absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <span class="sr-only">{{ t('systemParameters.search') }}</span>
        <Input v-model="filters.keyword" class="pl-9" :placeholder="t('systemParameters.search')" />
      </label>
      <Select v-model="filters.status">
        <!-- AI modified: the standalone status trigger needs a stable accessible name outside FormField. -->
        <SelectTrigger class="w-full sm:w-44" :aria-label="t('systemParameters.status')">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {{ t('systemParameters.allStatuses') }}
          </SelectItem>
          <SelectItem
            v-for="parameterStatus in SYSTEM_PARAMETER_STATUSES"
            :key="parameterStatus"
            :value="parameterStatus"
          >
            {{ t(`systemParameters.${parameterStatus}`) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <span class="text-xs text-muted-foreground">
        {{ t('systemParameters.total', { total }) }}
      </span>
    </div>

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
