<script setup lang="ts">
import type { RoleDefinition, UpdateRolePolicyInput } from '@/features/roles/types'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import RoleCardSelector from '@/features/roles/components/RoleCardSelector.vue'
import RolePermissionMatrix from '@/features/roles/components/RolePermissionMatrix.vue'
import { useRoleManagement } from '@/features/roles/composables/useRoleManagement'
import { canAccess } from '@/lib/ability'

const { t } = useI18n()
const selectedRoleKey = shallowRef<RoleDefinition['key']>('admin')
const { isLoading, isSaving, queryError, roles, saveRolePolicy, scopeDepartments }
  = useRoleManagement()

const selectedRole = computed(() => roles.value.find(role => role.key === selectedRoleKey.value))
const canEditRoles = computed(() => canAccess('update', 'RolePolicy'))
const errorMessage = computed(() => (queryError.value ? getErrorMessage(queryError.value) : null))

watch(
  roles,
  (availableRoles) => {
    if (!availableRoles.some(role => role.key === selectedRoleKey.value)) {
      selectedRoleKey.value = availableRoles[0]?.key ?? 'admin'
    }
  },
  { immediate: true },
)

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : t('errors.networkError')
}

function selectRole(roleKey: RoleDefinition['key']): void {
  selectedRoleKey.value = roleKey
}

async function savePolicy(input: UpdateRolePolicyInput): Promise<void> {
  if (!selectedRole.value)
    return

  try {
    await saveRolePolicy({ roleKey: selectedRole.value.key, input })
    toast.success(t('roles.saveSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('roles.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('roles.description') }}
      </p>
    </div>

    <!-- AI modified: async query failures are announced when they enter the DOM. -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <div v-if="isLoading" class="grid gap-4 lg:grid-cols-3">
      <Card v-for="card in 3" :key="card">
        <CardContent class="space-y-4 pt-6">
          <Skeleton class="size-10 rounded-lg" />
          <Skeleton class="h-5 w-28" />
          <Skeleton class="h-4 w-full" />
        </CardContent>
      </Card>
    </div>
    <template v-else>
      <RoleCardSelector :roles="roles" :selected-role-key="selectedRoleKey" @select="selectRole" />
      <RolePermissionMatrix
        v-if="selectedRole"
        :role="selectedRole"
        :can-edit="canEditRoles"
        :is-saving="isSaving"
        :departments="scopeDepartments"
        @save="savePolicy"
      />
    </template>
  </section>
</template>
