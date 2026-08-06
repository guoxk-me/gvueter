<script setup lang="ts">
import { Loader2, MailCheck } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { z } from 'zod'
import { focusFirstInvalidControlAfterValidation } from '@/components/admin/form-focus'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const isLoading = ref(false)
const isSuccess = ref(false)
const sentEmail = ref('')
const formElement = useTemplateRef<HTMLFormElement>('formElement')
const successHeading = useTemplateRef<HTMLElement>('successHeading')

const maskedEmail = computed(() => {
  const email = sentEmail.value
  const atIdx = email.indexOf('@')
  if (atIdx <= 1) return email
  return `${email[0]}***${email.slice(atIdx)}`
})

const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      email: z
        .string({ required_error: t('auth.emailRequired') })
        .min(1, t('auth.emailRequired'))
        .email(t('auth.emailInvalid')),
    }),
  ),
)

const { handleSubmit, setFieldError } = useForm({ validationSchema: formSchema })

const onSubmit = handleSubmit(
  async (values) => {
    if (isLoading.value) return

    // AI modified: the pending guard prevents repeated reset-email mutations.
    isLoading.value = true
    try {
      await authStore.forgotPassword(values.email)
      sentEmail.value = values.email
      isSuccess.value = true
      await nextTick()
      successHeading.value?.focus()
    } catch {
      setFieldError('email', t('errors.serverError'))
      await focusFirstInvalidControlAfterValidation(formElement.value)
    } finally {
      isLoading.value = false
    }
  },
  () => void focusFirstInvalidControlAfterValidation(formElement.value),
)
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <div
        aria-hidden="true"
        class="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        <svg
          class="size-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      </div>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">
        {{ t('auth.forgotPasswordTitle') }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('auth.forgotPasswordSubtitle') }}
      </p>
    </div>

    <div class="rounded-xl border border-border bg-card p-8 shadow-sm">
      <div v-if="isSuccess" class="flex flex-col items-center gap-4 py-2 text-center">
        <div
          class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <MailCheck class="size-7" aria-hidden="true" />
        </div>
        <div>
          <h2 ref="successHeading" tabindex="-1" class="font-semibold text-foreground outline-none">
            {{ t('auth.forgotPasswordSuccessTitle') }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('auth.forgotPasswordSuccessDesc', { email: maskedEmail }) }}
          </p>
        </div>
        <Button as-child class="w-full">
          <RouterLink :to="{ name: 'login' }">
            {{ t('auth.forgotPasswordBackToLogin') }}
          </RouterLink>
        </Button>
      </div>

      <form
        v-else
        ref="formElement"
        class="space-y-4"
        novalidate
        :aria-label="t('auth.forgotPasswordFormLabel')"
        @submit.prevent="onSubmit"
      >
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>{{ t('auth.email') }}</FormLabel>
            <FormControl>
              <Input
                v-bind="componentField"
                type="email"
                :placeholder="t('auth.emailPlaceholder')"
                autocomplete="email"
                :disabled="isLoading"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button type="submit" class="w-full" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" aria-hidden="true" />
          <span v-if="isLoading">{{ t('auth.forgotPasswordSending') }}</span>
          <span v-else>{{ t('auth.forgotPasswordSendButton') }}</span>
        </Button>
      </form>
    </div>

    <p v-if="!isSuccess" class="text-center text-sm text-muted-foreground">
      <RouterLink :to="{ name: 'login' }" class="hover:text-foreground hover:underline">
        {{ t('auth.forgotPasswordBackLink') }}
      </RouterLink>
    </p>
  </div>
</template>
