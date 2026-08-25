<script setup lang="ts">
import type { DepartmentInput, DepartmentRecord } from '@/features/departments/types'
import { Plus } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { useDepartmentManagement } from '@/features/departments/composables/useDepartmentManagement'
import { appAbility } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import DepartmentFormDialog from './DepartmentFormDialog.vue'
import DepartmentTreeTable from './DepartmentTreeTable.vue'

const { t } = useI18n()
const isFormOpen = shallowRef(false)
const selectedDepartment = shallowRef<DepartmentRecord>()
const canManage = computed(() => appAbility.can('update', 'Settings'))
const {
  departments,
  queryError,
  isLoading,
  isSaving,
  isDeleting,
  saveDepartment,
  deleteDepartment,
} = useDepartmentManagement()

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function createDepartment(): void {
  selectedDepartment.value = undefined
  isFormOpen.value = true
}

function editDepartment(department: DepartmentRecord): void {
  selectedDepartment.value = department
  isFormOpen.value = true
}

async function save(input: DepartmentInput): Promise<void> {
  try {
    await saveDepartment({ department: selectedDepartment.value, input })
    isFormOpen.value = false
    toast.success(t('departments.saveSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function remove(department: DepartmentRecord): Promise<void> {
  try {
    await deleteDepartment(department)
    toast.success(t('departments.deleteSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('departments.title')" :description="t('departments.description')">
      <template #actions>
        <Button v-if="canManage" type="button" @click="createDepartment">
          <Plus class="size-4" aria-hidden="true" />
          {{ t('departments.create') }}
        </Button>
      </template>
    </PageHeader>

    <!-- AI modified: async query failures are announced when they enter the DOM. -->
    <div
      v-if="queryError"
      role="alert"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ getErrorMessage(queryError) }}
    </div>

    <DepartmentTreeTable
      :departments="departments"
      :is-loading="isLoading"
      :is-deleting="isDeleting"
      :can-manage="canManage"
      @edit="editDepartment"
      @delete="remove"
    />
    <DepartmentFormDialog
      v-model:open="isFormOpen"
      :department="selectedDepartment"
      :departments="departments"
      :is-saving="isSaving"
      @save="save"
    />
  </section>
</template>
