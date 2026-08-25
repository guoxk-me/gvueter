<script setup lang="ts">
import type { ProfileInput } from '@/features/account/types'
import { shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import PageHeader from '@/components/admin/PageHeader.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ProfileForm from '@/features/account/components/ProfileForm.vue'
import { useAuthStore } from '@/stores/auth'

defineOptions({ name: 'ProfilePage' })

const auth = useAuthStore()
const { t } = useI18n()
const isSubmitting = shallowRef(false)

async function saveProfile(profile: ProfileInput) {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true
  // AI modified: a page-level guard prevents duplicate profile requests from repeated submits.
  try {
    await auth.updateProfile(profile)
    toast.success(t('account.profileSaved'))
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
    <PageHeader :title="t('account.profileTitle')" :description="t('account.profileDescription')" />

    <Card v-if="auth.user" class="max-w-2xl">
      <CardHeader>
        <CardTitle>{{ t('account.basicInformation') }}</CardTitle>
        <CardDescription>{{ t('account.basicInformationDescription') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm
          :key="`${auth.user.id}:${auth.user.email}`"
          :user="auth.user"
          :is-submitting="isSubmitting"
          @submit="saveProfile"
        />
      </CardContent>
    </Card>
  </div>
</template>
