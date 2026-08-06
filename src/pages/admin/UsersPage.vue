<script setup lang="ts">
import type { PaginationState, RowSelectionState, SortingState } from '@tanstack/vue-table'
import type { FileUploadRejection } from '@/components/admin'
import type { ProTableDensity } from '@/components/pro-table'
import type {
  AdminUser,
  UserImportResponse,
  UserInput,
  UserListFilters,
  UserListQuery,
  UserListResponse,
  UserSortField,
} from '@/features/users/types'
import type { ComponentSize } from '@/stores/appearance'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ImportDialog } from '@/components/admin'
import { useTableUrlState } from '@/composables/use-table-url-state'
import { useUploadPolicy } from '@/features/uploads/composables/useUploadPolicy'
import { applyUploadPolicy } from '@/features/uploads/upload-policy'
import UserDeleteDialog from '@/features/users/components/UserDeleteDialog.vue'
import UserFormDialog from '@/features/users/components/UserFormDialog.vue'
import UserTable from '@/features/users/components/UserTable.vue'
import UserToolbar from '@/features/users/components/UserToolbar.vue'
import { USER_ROLES, USER_STATUSES } from '@/features/users/types'
import {
  ADMIN_USER_SCHEMA,
  USER_IMPORT_RESPONSE_SCHEMA,
  USER_LIST_RESPONSE_SCHEMA,
} from '@/features/users/user-api-contracts'
import { USER_IMPORT_UPLOAD_RULES } from '@/features/users/user-import-policy'
import { canAccess } from '@/lib/ability'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { ApiError, del, get, post, put, uploadFileBytes } from '@/lib/http'
import { useAppearanceStore } from '@/stores/appearance'
import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'UsersPage' })

interface UserChangeRequest {
  user?: AdminUser
  input: UserInput
}

interface DeleteUsersOutcome {
  requestedUserIds: number[]
  successfulUserIds: number[]
  failedUserIds: number[]
  firstFailure?: unknown
}

const defaultFilters: UserListFilters = {
  keyword: '',
  role: 'all',
  status: 'all',
}
const userSortFields: readonly UserSortField[] = ['createdAt', 'email', 'name', 'role', 'status']

const { t } = useI18n()
const queryClient = useQueryClient()
const appearance = useAppearanceStore()
const auth = useAuthStore()

const searchValues = shallowRef<UserListFilters>({ ...defaultFilters })
const appliedFilters = shallowRef<UserListFilters>({ ...defaultFilters })
const pagination = shallowRef<PaginationState>({ pageIndex: 0, pageSize: 5 })
const sorting = shallowRef<SortingState>([{ id: 'createdAt', desc: true }])
const selectedRowIds = shallowRef<RowSelectionState>({})
const tableDensity = shallowRef<ProTableDensity>(getTableDensity(appearance.componentSize))
const selectedUser = shallowRef<AdminUser>()
const isFormOpen = shallowRef(false)
const isDeleteOpen = shallowRef(false)
const isImportOpen = shallowRef(false)
const {
  policy: uploadPolicy,
  queryError: uploadPolicyError,
  isLoading: isUploadPolicyLoading,
  refresh: refreshUploadPolicy,
} = useUploadPolicy()
const effectiveUserImportPolicy = computed(() =>
  uploadPolicy.value ? applyUploadPolicy(uploadPolicy.value, USER_IMPORT_UPLOAD_RULES) : undefined,
)
const isUserImportDisabled = computed(
  () =>
    isUploadPolicyLoading.value ||
    (!uploadPolicyError.value &&
      !effectiveUserImportPolicy.value?.allowedExtensions.includes('csv')),
)
const userImportDisabledReason = computed(() =>
  isUploadPolicyLoading.value ? t('users.importPolicyLoading') : t('users.importPolicyDisabled'),
)

useTableUrlState({
  filters: appliedFilters,
  pagination,
  sorting,
  defaultFilters,
  defaultPagination: { pageIndex: 0, pageSize: 5 },
  defaultSorting: [{ id: 'createdAt', desc: true }],
  pageSizeOptions: [5, 10, 20, 50],
  sortColumnIds: userSortFields,
  filterRules: {
    keyword: { queryKey: 'keyword' },
    role: { queryKey: 'role', acceptedValues: ['all', ...USER_ROLES] },
    status: { queryKey: 'status', acceptedValues: ['all', ...USER_STATUSES] },
  },
})

watch(
  appliedFilters,
  // AI modified: restored URL filters also repopulate the visible query controls.
  (filters) => (searchValues.value = { ...filters }),
)

watch(
  [() => pagination.value.pageSize, sorting, appliedFilters],
  // AI modified: URL-restored shaping changes invalidate selections from the previous dataset.
  () => (selectedRowIds.value = {}),
  { deep: true },
)

const canCreateUser = computed(() => canAccess('create', 'User'))
const canManageUsers = computed(() => canAccess('update', 'User'))
const canDeleteUsers = computed(() => canAccess('delete', 'User'))
const canAssignUserRoles = computed(() => canAccess('update', 'RolePolicy'))

function getTableDensity(componentSize: ComponentSize): ProTableDensity {
  if (componentSize === 'sm') return 'compact'
  if (componentSize === 'lg') return 'comfortable'
  return 'standard'
}

watch(
  () => appearance.componentSize,
  // AI modified: the global component-size preference sets the business table's starting density.
  (componentSize) => (tableDensity.value = getTableDensity(componentSize)),
)

function getSortField(columnId: string | undefined): UserSortField | undefined {
  return userSortFields.find((field) => field === columnId)
}

const userQuery = computed<UserListQuery>(() => {
  const activeSorting = sorting.value[0]
  return {
    ...appliedFilters.value,
    page: pagination.value.pageIndex + 1,
    pageSize: pagination.value.pageSize,
    sortField: getSortField(activeSorting?.id),
    sortDirection: activeSorting ? (activeSorting.desc ? 'desc' : 'asc') : undefined,
  }
})

const usersQuery = useQuery({
  queryKey: computed(() => ['users', userQuery.value]),
  queryFn: () => {
    const query = userQuery.value
    return get<UserListResponse>(
      '/users',
      {
        keyword: query.keyword || undefined,
        role: query.role === 'all' ? undefined : query.role,
        status: query.status === 'all' ? undefined : query.status,
        page: query.page,
        pageSize: query.pageSize,
        sortField: query.sortField,
        sortDirection: query.sortDirection,
      },
      { responseSchema: USER_LIST_RESPONSE_SCHEMA },
    )
  },
  placeholderData: keepPreviousData,
})

const saveUserMutation = useMutation({
  mutationFn: ({ user, input }: UserChangeRequest) =>
    user
      ? put<AdminUser>(`/users/${user.id}`, input, { responseSchema: ADMIN_USER_SCHEMA })
      : post<AdminUser>('/users', input, { responseSchema: ADMIN_USER_SCHEMA }),
  onSuccess: async (savedUser) => {
    // AI modified: editing the signed-in account keeps shell identity state aligned with the server.
    if (auth.user?.id === savedUser.id) {
      // AI modified: role changes require a fresh backend authorization snapshot before CASL changes.
      if (auth.user.role !== savedUser.role) await auth.refreshPrincipal()
      else auth.setUser(savedUser)
    }
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    isFormOpen.value = false
    toast.success(t('users.saveSuccess'))
  },
  onError: (error: unknown) => toast.error(getErrorMessage(error)),
})

const deleteUsersMutation = useMutation({
  mutationFn: async (userIds: number[]): Promise<DeleteUsersOutcome> => {
    // AI modified: independent settlement preserves the exact partial-success boundary.
    const deleteRequests = await Promise.allSettled(
      userIds.map((userId) =>
        del<null>(`/users/${userId}`, { responseSchema: EMPTY_RESPONSE_SCHEMA }),
      ),
    )
    const successfulUserIds: number[] = []
    const failedUserIds: number[] = []
    let firstFailure: unknown

    deleteRequests.forEach((request, index) => {
      const userId = userIds[index]
      if (userId === undefined) return
      if (request.status === 'fulfilled') successfulUserIds.push(userId)
      else {
        failedUserIds.push(userId)
        firstFailure ??= request.reason
      }
    })

    return { requestedUserIds: userIds, successfulUserIds, failedUserIds, firstFailure }
  },
  onSuccess: (outcome) => {
    const remainingUsers = Math.max(
      (usersQuery.data.value?.total ?? 0) - outcome.successfulUserIds.length,
      0,
    )
    const lastPageIndex = Math.max(Math.ceil(remainingUsers / pagination.value.pageSize) - 1, 0)
    if (pagination.value.pageIndex > lastPageIndex)
      pagination.value = { ...pagination.value, pageIndex: lastPageIndex }

    selectedRowIds.value = Object.fromEntries(
      outcome.failedUserIds.map((userId) => [String(userId), true]),
    )
    isDeleteOpen.value = false
    if (outcome.failedUserIds.length === 0) {
      toast.success(
        outcome.requestedUserIds.length > 1
          ? t('users.bulkDeleteSuccess', { count: outcome.successfulUserIds.length })
          : t('users.deleteSuccess'),
      )
      return
    }

    const description = t('users.bulkDeleteFailedIds', {
      ids: outcome.failedUserIds.join(', '),
    })
    if (outcome.successfulUserIds.length > 0) {
      toast.warning(
        t('users.bulkDeletePartial', {
          succeeded: outcome.successfulUserIds.length,
          failed: outcome.failedUserIds.length,
        }),
        { description },
      )
    } else {
      toast.error(t('users.bulkDeleteFailed', { count: outcome.failedUserIds.length }), {
        description: `${description} ${getErrorMessage(outcome.firstFailure)}`,
      })
    }
  },
  onError: (error: unknown) => toast.error(getErrorMessage(error)),
  // AI modified: every attempted batch refreshes the server snapshot, including unexpected failures.
  onSettled: async () => queryClient.invalidateQueries({ queryKey: ['users'] }),
})

const importUsersMutation = useMutation({
  mutationFn: (file: File) =>
    uploadFileBytes<UserImportResponse>('/users/import', file, {
      responseSchema: USER_IMPORT_RESPONSE_SCHEMA,
    }),
  onSuccess: async (summary) => {
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    isImportOpen.value = false
    const description = summary.issues
      .slice(0, 3)
      .map((issue) =>
        t('users.importIssue', {
          row: issue.row,
          reason: t(`users.importIssues.${issue.code}`),
        }),
      )
      .join(' ')

    // AI modified: partial imports remain visible instead of hiding skipped row validation.
    const message = t('users.importSummary', {
      created: summary.createdCount,
      skipped: summary.skippedCount,
    })
    if (summary.skippedCount > 0) toast.warning(message, { description })
    else toast.success(message)
  },
  onError: (error: unknown) => toast.error(getErrorMessage(error)),
})

const users = computed(() => usersQuery.data.value?.items ?? [])
const totalUsers = computed(() => usersQuery.data.value?.total ?? 0)
const selectedUserIds = computed(() =>
  Object.entries(selectedRowIds.value)
    .filter(([, isSelected]) => isSelected)
    .map(([userId]) => Number(userId))
    .filter(Number.isInteger),
)
const errorMessage = computed(() =>
  usersQuery.error.value ? getErrorMessage(usersQuery.error.value) : null,
)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function applySearch(filters: UserListFilters): void {
  appliedFilters.value = { ...filters }
  selectedRowIds.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
}

async function refreshUsers(): Promise<void> {
  // AI modified: an explicit refresh invalidates selections tied to the previous server snapshot.
  selectedRowIds.value = {}
  await usersQuery.refetch()
}

function openCreateUserDialog(): void {
  selectedUser.value = undefined
  isFormOpen.value = true
}

function openEditUserDialog(user: AdminUser): void {
  selectedUser.value = user
  isFormOpen.value = true
}

function openDeleteUserDialog(user: AdminUser): void {
  selectedUser.value = user
  isDeleteOpen.value = true
}

function openBulkDeleteDialog(): void {
  selectedUser.value = undefined
  isDeleteOpen.value = selectedUserIds.value.length > 0
}

async function openImportDialog(): Promise<void> {
  if (isUploadPolicyLoading.value) {
    toast.info(t('users.importPolicyLoading'))
    return
  }

  let policy = effectiveUserImportPolicy.value
  if (uploadPolicyError.value) {
    // AI modified: the enabled error-state action doubles as the missing upload-policy recovery path.
    const retryOutcome = await refreshUploadPolicy()
    if (retryOutcome.error || !retryOutcome.data) {
      toast.error(t('users.importPolicyUnavailable'))
      return
    }
    policy = applyUploadPolicy(retryOutcome.data, USER_IMPORT_UPLOAD_RULES)
  }
  if (!policy?.allowedExtensions.includes('csv')) {
    toast.error(t('users.importPolicyDisabled'))
    return
  }

  // AI modified: user imports open only after the authenticated safe policy permits CSV.
  isImportOpen.value = true
}

function importUsers(file: File): void {
  const policy = effectiveUserImportPolicy.value
  if (
    uploadPolicyError.value ||
    !policy ||
    !policy.allowedExtensions.includes('csv') ||
    file.size > policy.maxFileSizeBytes
  ) {
    // AI modified: a policy refresh cannot leave a stale CSV selection eligible for submission.
    isImportOpen.value = false
    toast.error(t('users.importPolicyChanged'))
    return
  }
  importUsersMutation.mutate(file)
}

function reportImportRejections(rejections: FileUploadRejection[]): void {
  if (rejections.length > 0) toast.error(t('users.importFileRejected'))
}

function saveUser(input: UserInput): void {
  saveUserMutation.mutate({ user: selectedUser.value, input })
}

function saveInlineUser(change: { user: AdminUser; columnId: string; value: string }): void {
  if (change.columnId !== 'name') return
  saveUserMutation.mutate({
    user: change.user,
    input: {
      name: change.value,
      email: change.user.email,
      role: change.user.role,
      status: change.user.status,
    },
  })
}

function deleteSelectedUsers(): void {
  const userIds = selectedUser.value ? [selectedUser.value.id] : selectedUserIds.value
  if (userIds.length > 0) deleteUsersMutation.mutate(userIds)
}
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t('users.title') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('users.description') }}
      </p>
    </div>

    <UserToolbar
      v-model:filters="searchValues"
      :default-values="defaultFilters"
      :can-create="canCreateUser"
      :is-searching="usersQuery.isFetching.value"
      @create="openCreateUserDialog"
      @search="applySearch"
      @reset="applySearch"
    />

    <!-- AI modified: async query failures are announced when they enter the DOM. -->
    <div
      v-if="errorMessage"
      role="alert"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <UserTable
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      v-model:selected-row-ids="selectedRowIds"
      v-model:density="tableDensity"
      :users="users"
      :total="totalUsers"
      :is-loading="usersQuery.isFetching.value"
      :can-manage="canManageUsers"
      :can-delete="canDeleteUsers"
      :can-import="canCreateUser"
      :is-import-disabled="isUserImportDisabled"
      :import-disabled-reason="userImportDisabledReason"
      @edit="openEditUserDialog"
      @delete="openDeleteUserDialog"
      @bulk-delete="openBulkDeleteDialog"
      @import="openImportDialog"
      @refresh="refreshUsers"
      @inline-edit="saveInlineUser"
    />

    <UserFormDialog
      v-model:open="isFormOpen"
      :user="selectedUser"
      :is-saving="saveUserMutation.isPending.value"
      :can-assign-roles="canAssignUserRoles"
      @save="saveUser"
    />
    <UserDeleteDialog
      v-model:open="isDeleteOpen"
      :user="selectedUser"
      :selected-count="selectedUserIds.length"
      :is-deleting="deleteUsersMutation.isPending.value"
      @confirm="deleteSelectedUsers"
    />
    <ImportDialog
      v-model:open="isImportOpen"
      accept=".csv"
      :allowed-extensions="effectiveUserImportPolicy?.allowedExtensions ?? []"
      :max-size="effectiveUserImportPolicy?.maxFileSizeBytes ?? 0"
      :title="t('users.importTitle')"
      :description="t('users.importDescription')"
      :upload-description="t('users.importFileDescription')"
      :import-label="t('users.importAction')"
      :is-importing="importUsersMutation.isPending.value"
      @import="importUsers"
      @rejected="reportImportRejections"
    />
  </section>
</template>
