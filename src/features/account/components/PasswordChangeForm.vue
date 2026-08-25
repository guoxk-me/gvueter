<script setup lang="ts">
import type { PasswordChangeInput } from '@/features/account/types'
import { Loader2 } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { focusFirstInvalidControlAfterValidation } from '@/components/admin/form-focus'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PASSWORD_MIN_LENGTH } from '@/features/account/types'
import PasswordStrength from './PasswordStrength.vue'

const props = defineProps<{
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  submit: [passwords: PasswordChangeInput]
}>()

const { t } = useI18n()
const formElement = useTemplateRef<HTMLFormElement>('formElement')

const validationSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        currentPassword: z.string().min(1, t('account.currentPasswordRequired')),
        newPassword: z
          .string()
          .min(PASSWORD_MIN_LENGTH, t('auth.passwordMinLength', { min: PASSWORD_MIN_LENGTH }))
          .regex(/[A-Z]/, t('account.passwordUppercase'))
          .regex(/[a-z]/, t('account.passwordLowercase'))
          .regex(/\d/, t('account.passwordNumber')),
        confirmPassword: z.string().min(1, t('auth.confirmPasswordPlaceholder')),
      })
      .refine(passwords => passwords.newPassword === passwords.confirmPassword, {
        message: t('auth.passwordMismatch'),
        path: ['confirmPassword'],
      })
      .refine(passwords => passwords.currentPassword !== passwords.newPassword, {
        message: t('account.passwordMustChange'),
        path: ['newPassword'],
      }),
  ),
)

const { handleSubmit, resetForm } = useForm<PasswordChangeInput>({ validationSchema })

const submitPasswords = handleSubmit(
  (passwords) => {
    if (props.isSubmitting) {
      return
    }

    emit('submit', passwords)
    // AI modified: the page can reset secrets after a successful request without exposing field refs.
  },
  () => void focusFirstInvalidControlAfterValidation(formElement.value),
)

defineExpose({ reset: resetForm })
</script>

<template>
  <form
    ref="formElement"
    class="space-y-5"
    novalidate
    :aria-label="t('account.security')"
    @submit.prevent="submitPasswords"
  >
    <FormField v-slot="{ componentField }" name="currentPassword">
      <FormItem>
        <FormLabel>{{ t('account.currentPassword') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            autocomplete="current-password"
            :disabled="isSubmitting"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField, value }" name="newPassword">
      <FormItem>
        <FormLabel>{{ t('auth.newPassword') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            autocomplete="new-password"
            :disabled="isSubmitting"
          />
        </FormControl>
        <PasswordStrength :password="String(value ?? '')" />
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="confirmPassword">
      <FormItem>
        <FormLabel>{{ t('auth.confirmPassword') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            autocomplete="new-password"
            :disabled="isSubmitting"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="flex justify-end">
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="mr-2 size-4 animate-spin" aria-hidden="true" />
        {{ isSubmitting ? t('account.changingPassword') : t('account.changePassword') }}
      </Button>
    </div>
  </form>
</template>
