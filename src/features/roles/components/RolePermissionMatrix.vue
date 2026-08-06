<script setup lang="ts">
import type { DepartmentRecord } from '@/features/departments/types'
import type {
  DataScope,
  DataScopeGrant,
  RoleDefinition,
  RolePermission,
  UpdateRolePolicyInput,
} from '@/features/roles/types'
import { Loader2, Save } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DepartmentTree } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ADMIN_ROLE_RECOVERY_PERMISSIONS,
  isAdminRoleRecoveryPermission,
} from '@/features/roles/role-policy'
import { DATA_SCOPES, PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from '@/features/roles/types'

const props = defineProps<{
  role: RoleDefinition
  canEdit: boolean
  isSaving: boolean
  departments: DepartmentRecord[]
}>()

const emit = defineEmits<{
  save: [input: UpdateRolePolicyInput]
}>()

const { t } = useI18n()
const draftPermissions = ref<RolePermission[]>([])
const draftDataScope = ref<DataScopeGrant>({ scope: 'self' })
const isEditable = computed(() => props.canEdit)

const isDirty = computed(
  () =>
    !hasSamePermissions(draftPermissions.value, props.role.permissions) ||
    !hasSameDataScope(draftDataScope.value, props.role.dataScope),
)
const isDataScopeValid = computed(
  () =>
    draftDataScope.value.scope !== 'custom' || Boolean(draftDataScope.value.departmentIds?.length),
)
const customDepartmentIds = computed<string[]>({
  get: () => draftDataScope.value.departmentIds ?? [],
  set: (departmentIds) => {
    if (isEditable.value) draftDataScope.value = { scope: 'custom', departmentIds }
  },
})
const unavailableDepartmentIds = computed(() =>
  isEditable.value && !props.isSaving ? [] : props.departments.map((department) => department.id),
)

watch(
  () => props.role,
  (role) => {
    draftPermissions.value = role.permissions.map((permission) => ({ ...permission }))
    draftDataScope.value = {
      ...role.dataScope,
      departmentIds: role.dataScope.departmentIds ? [...role.dataScope.departmentIds] : undefined,
    }
  },
  { immediate: true },
)

function getPermissionKey(permission: RolePermission): string {
  return `${permission.action}:${permission.subject}`
}

function hasPermission(permission: RolePermission): boolean {
  const permissionKey = getPermissionKey(permission)
  return draftPermissions.value.some((candidate) => getPermissionKey(candidate) === permissionKey)
}

function hasSamePermissions(left: RolePermission[], right: RolePermission[]): boolean {
  return (
    left.length === right.length &&
    left.every((permission) =>
      right.some((candidate) => getPermissionKey(candidate) === getPermissionKey(permission)),
    )
  )
}

function hasSameDataScope(left: DataScopeGrant, right: DataScopeGrant): boolean {
  if (left.scope !== right.scope) return false
  const leftDepartmentIds = [...(left.departmentIds ?? [])].sort()
  const rightDepartmentIds = [...(right.departmentIds ?? [])].sort()
  return (
    leftDepartmentIds.length === rightDepartmentIds.length &&
    leftDepartmentIds.every((departmentId, index) => departmentId === rightDepartmentIds[index])
  )
}

function setDataScope(scope: unknown): void {
  if (!isEditable.value || typeof scope !== 'string' || !DATA_SCOPES.includes(scope as DataScope))
    return
  draftDataScope.value =
    scope === 'custom'
      ? { scope, departmentIds: draftDataScope.value.departmentIds ?? [] }
      : { scope: scope as DataScope }
}

function setPermission(permission: RolePermission, checked: boolean | 'indeterminate'): void {
  if (!isEditable.value || isRecoveryPermissionLocked(permission)) return
  const permissionKey = getPermissionKey(permission)
  if (checked === true && !hasPermission(permission)) {
    draftPermissions.value = [...draftPermissions.value, { ...permission }]
    return
  }

  if (checked !== true) {
    draftPermissions.value = draftPermissions.value.filter(
      (candidate) => getPermissionKey(candidate) !== permissionKey,
    )
  }
}

function setAllPermissions(isGranted: boolean): void {
  if (!isEditable.value) return

  if (isGranted) {
    // AI modified: bulk grants use the same explicit action/subject matrix as individual checkboxes.
    draftPermissions.value = PERMISSION_SUBJECTS.flatMap((subject) =>
      PERMISSION_ACTIONS.map((action) => ({ action, subject })),
    )
    return
  }

  // AI modified: clearing an admin policy retains the minimum permissions needed to recover it.
  draftPermissions.value =
    props.role.key === 'admin'
      ? ADMIN_ROLE_RECOVERY_PERMISSIONS.map((permission) => ({ ...permission }))
      : []
}

function isRecoveryPermissionLocked(permission: RolePermission): boolean {
  return isAdminRoleRecoveryPermission(props.role.key, permission)
}

// AI modified: one preview connects matrix grants to their route, menu, button, field, and data effects.
const policyLayerPreviews = computed(() => [
  {
    key: 'route',
    isGranted: hasPermission({ action: 'read', subject: 'Settings' }),
    detail: t('roles.layerRouteDetail'),
  },
  {
    key: 'menu',
    isGranted: hasPermission({ action: 'read', subject: 'Settings' }),
    detail: t('roles.layerMenuDetail'),
  },
  {
    key: 'button',
    isGranted: hasPermission({ action: 'delete', subject: 'User' }),
    detail: t('roles.layerButtonDetail'),
  },
  {
    key: 'field',
    isGranted: hasPermission({ action: 'update', subject: 'User' }),
    detail: t('roles.layerFieldDetail'),
  },
  {
    key: 'dataScope',
    isGranted: true,
    detail: t(`roles.dataScope.${draftDataScope.value.scope}`),
  },
])

function savePolicy(): void {
  if (isDirty.value && isDataScopeValid.value && isEditable.value) {
    emit('save', {
      permissions: draftPermissions.value.map((permission) => ({ ...permission })),
      dataScope: {
        ...draftDataScope.value,
        departmentIds: draftDataScope.value.departmentIds
          ? [...draftDataScope.value.departmentIds]
          : undefined,
      },
    })
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex flex-wrap items-center gap-2">
        <CardTitle>{{ t('roles.matrixTitle', { role: t(`roles.${role.key}`) }) }}</CardTitle>
        <!-- AI modified: distinguish the full default policy without changing authorization semantics. -->
        <Badge v-if="role.key === 'admin'" variant="secondary">
          {{ t('roles.superAdminBadge') }}
        </Badge>
      </div>
      <CardDescription>{{ t('roles.matrixDescription') }}</CardDescription>
      <p
        v-if="role.key === 'admin'"
        id="admin-role-recovery-hint"
        class="text-sm text-muted-foreground"
      >
        {{ t('roles.adminRecoveryHint') }}
      </p>
    </CardHeader>
    <CardContent class="space-y-6">
      <div class="rounded-lg border border-border bg-muted/15 p-4" data-testid="role-policy-layers">
        <div class="mb-3 space-y-1">
          <h3 class="text-sm font-semibold">
            {{ t('roles.layerPreviewTitle') }}
          </h3>
          <p class="text-xs text-muted-foreground">
            {{ t('roles.authorityBoundary') }}
          </p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <div
            v-for="policyLayer in policyLayerPreviews"
            :key="policyLayer.key"
            class="rounded-md border border-border bg-background p-3"
          >
            <div class="mb-1 flex items-center justify-between gap-2">
              <span class="text-sm font-medium">{{ t(`roles.layers.${policyLayer.key}`) }}</span>
              <Badge :variant="policyLayer.isGranted ? 'default' : 'outline'">
                {{ policyLayer.isGranted ? t('roles.allowed') : t('roles.denied') }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ policyLayer.detail }}
            </p>
          </div>
        </div>
      </div>
      <div class="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
        <div class="space-y-1">
          <Label for="role-data-scope">{{ t('roles.dataScopeTitle') }}</Label>
          <p class="text-sm text-muted-foreground">
            {{ t('roles.dataScopeDescription') }}
          </p>
        </div>
        <Select
          :model-value="draftDataScope.scope"
          :disabled="!isEditable || isSaving"
          @update:model-value="setDataScope"
        >
          <SelectTrigger id="role-data-scope" class="w-full sm:max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="scope in DATA_SCOPES" :key="scope" :value="scope">
              {{ t(`roles.dataScope.${scope}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <div v-if="draftDataScope.scope === 'custom'" class="space-y-2">
          <!-- AI modified: custom record scopes reuse the same accessible organization tree as business selectors. -->
          <DepartmentTree
            v-model:checked-ids="customDepartmentIds"
            :departments="departments"
            :disabled-ids="unavailableDepartmentIds"
            :label="t('roles.customDepartments')"
            :checkable="true"
            :selectable="false"
          />
          <p v-if="!isDataScopeValid" class="text-sm text-destructive">
            {{ t('roles.customDepartmentRequired') }}
          </p>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-medium">
          {{ t('roles.bulkActions') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="!isEditable || isSaving"
            @click="setAllPermissions(true)"
          >
            {{ t('roles.grantAll') }}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            :disabled="!isEditable || isSaving"
            @click="setAllPermissions(false)"
          >
            {{ t('roles.clearAll') }}
          </Button>
        </div>
      </div>
      <!-- AI modified: use the base table primitives so matrix tables share responsive behavior. -->
      <Table class="min-w-175 rounded-lg border border-border">
        <TableHeader class="bg-muted/40">
          <TableRow>
            <TableHead scope="col" class="h-11 px-4 text-left text-muted-foreground">
              {{ t('roles.action') }}
            </TableHead>
            <TableHead
              v-for="subject in PERMISSION_SUBJECTS"
              :key="subject"
              scope="col"
              class="h-11 px-4 text-center text-muted-foreground"
            >
              {{ t(`permissions.subjects.${subject}`) }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="action in PERMISSION_ACTIONS" :key="action">
            <TableHead scope="row" class="h-12 px-4 text-left">
              {{ t(`permissions.actions.${action}`) }}
            </TableHead>
            <TableCell
              v-for="subject in PERMISSION_SUBJECTS"
              :key="subject"
              class="h-12 px-4 text-center"
            >
              <Checkbox
                :id="`${role.key}-${action}-${subject}`"
                :model-value="hasPermission({ action, subject })"
                :disabled="
                  !isEditable || isSaving || isRecoveryPermissionLocked({ action, subject })
                "
                :aria-label="`${t(`permissions.actions.${action}`)} ${t(`permissions.subjects.${subject}`)}`"
                :aria-describedby="
                  isRecoveryPermissionLocked({ action, subject })
                    ? 'admin-role-recovery-hint'
                    : undefined
                "
                @update:model-value="setPermission({ action, subject }, $event)"
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
    <CardFooter class="justify-between gap-4 border-t pt-6">
      <p class="text-sm text-muted-foreground">
        {{ isEditable ? t('roles.matrixHint') : t('roles.readOnlyHint') }}
      </p>
      <Button
        :disabled="!isEditable || !isDirty || !isDataScopeValid || isSaving"
        @click="savePolicy"
      >
        <Loader2 v-if="isSaving" class="mr-2 size-4 animate-spin" aria-hidden="true" />
        <Save v-else class="mr-2 size-4" aria-hidden="true" />
        {{ isSaving ? t('common.saving') : t('roles.savePolicy') }}
      </Button>
    </CardFooter>
  </Card>
</template>
