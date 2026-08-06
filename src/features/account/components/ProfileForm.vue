<script setup lang="ts">
import type { ProfileInput } from '@/features/account/types'
import type { AdminUser } from '@/features/users/types'
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

const props = defineProps<{
  user: AdminUser
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  submit: [profile: ProfileInput]
}>()

const { t } = useI18n()
const formElement = useTemplateRef<HTMLFormElement>('formElement')

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().trim().min(2, t('account.nameMinLength')),
      email: z.string().trim().email(t('auth.emailInvalid')),
    }),
  ),
)

const { handleSubmit } = useForm<ProfileInput>({
  validationSchema,
  initialValues: {
    name: props.user.name,
    email: props.user.email,
  },
})

const submitProfile = handleSubmit(
  (profile) => {
    if (props.isSubmitting) {
      return
    }

    // AI modified: only validated, transformed profile fields cross the component boundary.
    emit('submit', profile)
  },
  () => void focusFirstInvalidControlAfterValidation(formElement.value),
)
</script>

<template>
  <form
    ref="formElement"
    class="space-y-5"
    novalidate
    :aria-label="t('account.basicInformation')"
    @submit.prevent="submitProfile"
  >
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>{{ t('account.displayName') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" autocomplete="name" :disabled="isSubmitting" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>{{ t('auth.email') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="email"
            autocomplete="email"
            :disabled="isSubmitting"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="flex justify-end">
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="mr-2 size-4 animate-spin" aria-hidden="true" />
        {{ isSubmitting ? t('common.saving') : t('account.saveProfile') }}
      </Button>
    </div>
  </form>
</template>
