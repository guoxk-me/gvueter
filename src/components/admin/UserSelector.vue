<script setup lang="ts">
import type { SearchableSelectOption } from './searchable-select'
import type { AdminUser, UserListResponse, UserStatus } from '@/features/users/types'
import { useQuery } from '@tanstack/vue-query'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { USER_LIST_RESPONSE_SCHEMA } from '@/features/users/user-api-contracts'
import { get } from '@/lib/http'
import SearchableSelect from './SearchableSelect.vue'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    searchPlaceholder?: string
    emptyLabel?: string
    loadingLabel?: string
    errorLabel?: string
    clearLabel?: string
    label?: string
    disabled?: boolean
    clearable?: boolean
    pageSize?: number
    status?: UserStatus | 'all'
  }>(),
  {
    disabled: false,
    clearable: true,
    pageSize: 20,
    status: 'all',
  },
)

const { t } = useI18n()
const selectedUserId = defineModel<number | undefined>()
const searchTerm = shallowRef('')
const selectedUser = shallowRef<AdminUser>()

const usersQuery = useQuery({
  queryKey: computed(() => ['user-selector', searchTerm.value, props.pageSize, props.status]),
  queryFn: () =>
    get<UserListResponse>(
      '/users',
      {
        keyword: searchTerm.value.trim() || undefined,
        page: 1,
        pageSize: props.pageSize,
        status: props.status === 'all' ? undefined : props.status,
      },
      {
        responseSchema: USER_LIST_RESPONSE_SCHEMA,
      },
    ),
  staleTime: 30_000,
})

watch(
  () => usersQuery.data.value?.items,
  (users) => {
    const matchingUser = users?.find((user) => user.id === selectedUserId.value)
    if (matchingUser) selectedUser.value = matchingUser
  },
  { immediate: true },
)

const userOptions = computed<SearchableSelectOption[]>(() => {
  const users = usersQuery.data.value?.items ?? []
  const selectableUsers =
    selectedUser.value && !users.some((user) => user.id === selectedUser.value?.id)
      ? [selectedUser.value, ...users]
      : users

  return selectableUsers.map((user) => ({
    value: String(user.id),
    label: user.name,
    keywords: [user.email, user.role],
    disabled: user.status === 'suspended',
  }))
})

const selectedUserKey = computed<string | null>({
  get: () => (selectedUserId.value === undefined ? null : String(selectedUserId.value)),
  set: (userKey) => {
    const userId = userKey === null ? undefined : Number(userKey)
    // AI modified: the selector exposes only a safe numeric identifier, never the remote user object.
    selectedUserId.value = userId === undefined || Number.isSafeInteger(userId) ? userId : undefined
    selectedUser.value = usersQuery.data.value?.items.find((user) => user.id === userId)
  },
})
</script>

<template>
  <div class="space-y-1.5">
    <SearchableSelect
      v-model="selectedUserKey"
      :options="userOptions"
      :placeholder="placeholder ?? t('components.selectors.userPlaceholder')"
      :search-placeholder="searchPlaceholder ?? t('components.selectors.userSearchPlaceholder')"
      :empty-label="emptyLabel ?? t('components.selectors.userEmpty')"
      :loading-label="loadingLabel ?? t('components.selectors.loading')"
      :clear-label="clearLabel ?? t('components.selectors.clearUser')"
      :label="label ?? t('components.selectors.userLabel')"
      :disabled="disabled"
      :is-loading="usersQuery.isFetching.value"
      :clearable="clearable"
      @search="searchTerm = $event"
    >
      <template #option="{ option }">
        <span class="min-w-0 truncate">{{ option.label }}</span>
        <span v-if="option.keywords?.[0]" class="ml-auto truncate text-xs text-muted-foreground">
          {{ option.keywords[0] }}
        </span>
      </template>
    </SearchableSelect>
    <p v-if="usersQuery.isError.value" class="text-sm text-destructive" role="alert">
      {{ errorLabel ?? t('components.selectors.userLoadError') }}
    </p>
  </div>
</template>
