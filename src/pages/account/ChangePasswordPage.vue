<script setup lang="ts">
import type { PasswordChangeInput } from '@/features/account/types'
import { shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/admin/PageHeader.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import PasswordChangeForm from '@/features/account/components/PasswordChangeForm.vue'
import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'ChangePasswordPage' })

const auth = useAuthStore()
const { t } = useI18n()
const isSubmitting = shallowRef(false)
const passwordForm = useTemplateRef<InstanceType<typeof PasswordChangeForm>>('passwordForm')

async function changePassword(passwords: PasswordChangeInput) {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  // AI modified: a page-level guard prevents duplicate password updates from repeated submits.
  try {
    await auth.changePassword(passwords.currentPassword, passwords.newPassword)
    passwordForm.value?.reset()
    toast.success(t('account.passwordChanged'))
  }
  catch (error: unknown) {
    toast.error(t('common.error'), {
      description: error instanceof Error ? error.message : t('errors.serverError'),
    })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('account.changePasswordTitle')"
      :description="t('account.changePasswordDescription')"
    />

    <Card class="max-w-2xl">
      <CardHeader>
        <CardTitle>{{ t('account.security') }}</CardTitle>
        <CardDescription>{{ t('account.securityDescription') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <PasswordChangeForm
          ref="passwordForm"
          :is-submitting="isSubmitting"
          @submit="changePassword"
        />
      </CardContent>
    </Card>
  </div>
</template>
