<script setup lang="ts">
import { CircleAlert, Loader2, MailCheck } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { z } from 'zod'
import { focusFirstInvalidControlAfterValidation } from '@/components/admin/form-focus'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const isLoading = shallowRef(false)
const isSuccess = shallowRef(false)
const hasSubmissionError = shallowRef(false)
const sentEmail = shallowRef('')
const formElement = useTemplateRef<HTMLFormElement>('formElement')
const successHeading = useTemplateRef<HTMLElement>('successHeading')

const maskedEmail = computed(() => {
  const email = sentEmail.value
  const atIdx = email.indexOf('@')
  if (atIdx <= 1)
    return email
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

const { handleSubmit } = useForm({ validationSchema: formSchema })

const onSubmit = handleSubmit(
  async (values) => {
    if (isLoading.value)
      return

    // AI modified: the pending guard prevents repeated reset-email mutations.
    hasSubmissionError.value = false
    isLoading.value = true
    try {
      await authStore.forgotPassword(values.email)
      sentEmail.value = values.email
      isSuccess.value = true
      await nextTick()
      successHeading.value?.focus()
    }
    catch {
      // AI modified: transport failures remain form-level so they cannot imply whether an account exists.
      hasSubmissionError.value = true
    }
    finally {
      isLoading.value = false
    }
  },
  () => void focusFirstInvalidControlAfterValidation(formElement.value),
)
</script>

<template>
  <section class="space-y-6" aria-labelledby="forgot-password-heading">
    <div>
      <p class="mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        {{ t('auth.accountRecovery') }}
      </p>
      <h1
        id="forgot-password-heading"
        class="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-foreground"
      >
        {{ t('auth.forgotPasswordTitle') }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">
        {{ t('auth.forgotPasswordSubtitle') }}
      </p>
    </div>

    <!-- AI modified: recovery states share the borderless 420px authentication recipe. -->
    <div v-if="isSuccess" class="space-y-6" role="status" aria-live="polite">
      <div class="flex items-start gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <MailCheck class="size-5" />
        </div>
        <div class="min-w-0 pt-0.5">
          <h2
            ref="successHeading"
            tabindex="-1"
            class="text-base font-semibold text-foreground outline-none"
          >
            {{ t('auth.forgotPasswordSuccessTitle') }}
          </h2>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            {{ t('auth.forgotPasswordSuccessDesc', { email: maskedEmail }) }}
          </p>
        </div>
      </div>
      <Button as-child size="lg" class="h-11 w-full sm:h-9">
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
      :aria-busy="isLoading"
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
              class="h-11 sm:h-9"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <Alert v-if="hasSubmissionError" variant="destructive" aria-live="assertive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>{{ t('auth.recoveryRequestFailed') }}</AlertTitle>
        <AlertDescription>{{ t('errors.serverError') }}</AlertDescription>
      </Alert>

      <Button type="submit" size="lg" class="h-11 w-full sm:h-9" :disabled="isLoading">
        <Loader2 v-if="isLoading" class="size-4 animate-spin" aria-hidden="true" />
        <span v-if="isLoading" role="status" aria-live="polite">
          {{ t('auth.forgotPasswordSending') }}
        </span>
        <span v-else>{{ t('auth.forgotPasswordSendButton') }}</span>
      </Button>
    </form>

    <p v-if="!isSuccess" class="text-center text-sm text-muted-foreground">
      <RouterLink
        :to="{ name: 'login' }"
        class="rounded-sm font-medium outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {{ t('auth.forgotPasswordBackLink') }}
      </RouterLink>
    </p>
  </section>
</template>
