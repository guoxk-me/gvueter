<script setup lang="ts">
import type { AdminUser, UserInput } from '@/features/users/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { FormDialog } from '@/components/admin'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// AI modified: user editing shares the password view through the account feature boundary.
import { PasswordStrength } from '@/features/account'
import { USER_ROLES, USER_STATUSES } from '@/features/users/types'

const props = defineProps<{
  user?: AdminUser
  isSaving: boolean
  canAssignRoles: boolean
}>()

const emit = defineEmits<{
  save: [input: UserInput]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const isEditing = computed(() => Boolean(props.user))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().trim().min(1, t('users.nameRequired')),
      email: z.string().trim().email(t('auth.emailInvalid')),
      role: z.enum(USER_ROLES),
      status: z.enum(USER_STATUSES),
      temporaryPassword: isEditing.value
        ? z.string().optional()
        : z
            .string()
            .min(8, t('auth.passwordMinLength', { min: 8 }))
            .regex(/[A-Z]/, t('account.passwordUppercase'))
            .regex(/[a-z]/, t('account.passwordLowercase'))
            .regex(/\d/, t('account.passwordNumber')),
    }),
  ),
)

const { handleSubmit, resetForm } = useForm<UserInput>({ validationSchema: formSchema })

watch(
  [open, () => props.user],
  ([isOpen]) => {
    if (!isOpen)
      return

    resetForm({
      values: {
        name: props.user?.name ?? '',
        email: props.user?.email ?? '',
        role: props.user?.role ?? 'viewer',
        status: props.user?.status ?? 'active',
        temporaryPassword: undefined,
      },
    })
  },
  { immediate: true },
)

const submitUser = handleSubmit((values) => {
  emit('save', {
    ...values,
    name: values.name.trim(),
    email: values.email.trim(),
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('users.editUser') : t('users.newUser')"
    :description="t('users.description')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitUser"
  >
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>{{ t('users.name') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" :disabled="isSaving" autocomplete="name" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>{{ t('users.email') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="email" :disabled="isSaving" autocomplete="email" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="role">
      <FormItem>
        <FormLabel>{{ t('users.role') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving || !canAssignRoles">
          <FormControl>
            <SelectTrigger><SelectValue /></SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem v-for="role in USER_ROLES" :key="role" :value="role">
              {{ t(`roles.${role}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p v-if="!canAssignRoles" class="text-xs text-muted-foreground">
          {{ t('users.roleAssignmentRestricted') }}
        </p>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="status">
      <FormItem>
        <FormLabel>{{ t('users.status') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger><SelectValue /></SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem v-for="status in USER_STATUSES" :key="status" :value="status">
              {{ t(`users.${status}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-if="!isEditing" v-slot="{ componentField, value }" name="temporaryPassword">
      <FormItem>
        <FormLabel>{{ t('users.temporaryPassword') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            :disabled="isSaving"
            autocomplete="new-password"
          />
        </FormControl>
        <p class="text-xs text-muted-foreground">
          {{ t('users.temporaryPasswordHint') }}
        </p>
        <PasswordStrength :password="String(value ?? '')" />
        <FormMessage />
      </FormItem>
    </FormField>
  </FormDialog>
</template>
