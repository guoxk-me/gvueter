<script setup lang="ts">
import type { ManagedMenuInput, ManagedMenuRecord } from '@/features/menus/types'
import { Plus } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { useMenuManagement } from '@/features/menus/composables/useMenuManagement'
import { canAccess } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import MenuFormDialog from './MenuFormDialog.vue'
import MenusTable from './MenusTable.vue'

const { t } = useI18n()
const isFormOpen = shallowRef(false)
const selectedMenu = shallowRef<ManagedMenuRecord>()
// AI modified: menu actions react immediately when the active role policy changes.
const canManage = computed(() => canAccess('update', 'Settings'))
const { menus, queryError, isLoading, isSaving, isDeleting, saveMenu, deleteMenu } =
  useMenuManagement()

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function createMenu(): void {
  selectedMenu.value = undefined
  isFormOpen.value = true
}

function editMenu(menu: ManagedMenuRecord): void {
  selectedMenu.value = menu
  isFormOpen.value = true
}

async function save(input: ManagedMenuInput): Promise<void> {
  try {
    await saveMenu({ menu: selectedMenu.value, input })
    isFormOpen.value = false
    toast.success(t('menus.saveSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function remove(menu: ManagedMenuRecord): Promise<void> {
  try {
    await deleteMenu(menu)
    toast.success(t('menus.deleteSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('menus.title')" :description="t('menus.description')">
      <template #actions>
        <Button v-if="canManage" type="button" @click="createMenu">
          <Plus class="size-4" aria-hidden="true" />
          {{ t('menus.create') }}
        </Button>
      </template>
    </PageHeader>

    <div class="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-foreground">
      {{ t('menus.permissionNotice') }}
    </div>
    <!-- AI modified: async query failures are announced when they enter the DOM. -->
    <div
      v-if="queryError"
      role="alert"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ getErrorMessage(queryError) }}
    </div>

    <MenusTable
      :menus="menus"
      :is-loading="isLoading"
      :is-deleting="isDeleting"
      :can-manage="canManage"
      @edit="editMenu"
      @delete="remove"
    />
    <MenuFormDialog
      v-model:open="isFormOpen"
      :menu="selectedMenu"
      :menus="menus"
      :is-saving="isSaving"
      @save="save"
    />
  </section>
</template>
