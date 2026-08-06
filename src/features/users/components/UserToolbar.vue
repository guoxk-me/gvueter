<script setup lang="ts">
import type { SearchFormField } from '@/components/admin'
import type { UserListFilters } from '@/features/users/types'
import { Plus } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SearchForm } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { USER_ROLES, USER_STATUSES } from '@/features/users/types'

defineProps<{
  canCreate: boolean
  defaultValues: UserListFilters
  isSearching: boolean
}>()

const emit = defineEmits<{
  create: []
  search: [filters: UserListFilters]
  reset: [filters: UserListFilters]
}>()

const filters = defineModel<UserListFilters>('filters', { required: true })
const { t } = useI18n()

const fields = computed<readonly SearchFormField<UserListFilters>[]>(() => [
  {
    name: 'keyword',
    type: 'search',
    label: t('common.search'),
    placeholder: t('users.searchPlaceholder'),
    inputMode: 'search',
  },
  {
    name: 'role',
    type: 'select',
    label: t('users.role'),
    placeholder: t('users.roleAll'),
    options: [
      { label: t('users.roleAll'), value: 'all' },
      ...USER_ROLES.map((role) => ({ label: t(`roles.${role}`), value: role })),
    ],
  },
  {
    name: 'status',
    type: 'select',
    label: t('users.status'),
    placeholder: t('users.statusAll'),
    options: [
      { label: t('users.statusAll'), value: 'all' },
      ...USER_STATUSES.map((status) => ({ label: t(`users.${status}`), value: status })),
    ],
  },
])
</script>

<template>
  <SearchForm
    v-model="filters"
    :fields="fields"
    :default-values="defaultValues"
    :search-label="t('common.search')"
    :reset-label="t('common.reset')"
    :is-searching="isSearching"
    @search="emit('search', $event)"
    @reset="emit('reset', $event)"
  >
    <template #actions>
      <Button v-if="canCreate" type="button" variant="outline" @click="emit('create')">
        <Plus class="mr-2 size-4" aria-hidden="true" />
        {{ t('users.newUser') }}
      </Button>
    </template>
  </SearchForm>
</template>
