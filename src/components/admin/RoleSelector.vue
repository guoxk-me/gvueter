<script setup lang="ts">
import type { SearchableSelectOption } from './searchable-select'
import type { UserRole } from '@/features/users/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { USER_ROLES } from '@/features/users/types'
import SearchableSelect from './SearchableSelect.vue'

const props = withDefaults(
  defineProps<{
    roles?: readonly UserRole[]
    disabledRoles?: readonly UserRole[]
    placeholder?: string
    searchPlaceholder?: string
    emptyLabel?: string
    clearLabel?: string
    label?: string
    disabled?: boolean
    clearable?: boolean
  }>(),
  {
    roles: () => USER_ROLES,
    disabledRoles: () => [],
    disabled: false,
    clearable: true,
  },
)

const { t } = useI18n()
const selectedRole = defineModel<UserRole | undefined>()
const selectedRoleKey = computed<UserRole | null>({
  get: () => selectedRole.value ?? null,
  set: role => (selectedRole.value = role ?? undefined),
})
const roleOptions = computed<SearchableSelectOption<UserRole>[]>(() =>
  props.roles.map(role => ({
    value: role,
    label: t(`roles.${role}`),
    disabled: props.disabledRoles.includes(role),
  })),
)
</script>

<template>
  <SearchableSelect
    v-model="selectedRoleKey"
    :options="roleOptions"
    :placeholder="placeholder ?? t('components.selectors.rolePlaceholder')"
    :search-placeholder="searchPlaceholder ?? t('components.selectors.roleSearchPlaceholder')"
    :empty-label="emptyLabel ?? t('components.selectors.roleEmpty')"
    :clear-label="clearLabel ?? t('components.selectors.clearRole')"
    :label="label ?? t('components.selectors.roleLabel')"
    :disabled="disabled"
    :clearable="clearable"
  />
</template>
