<script setup lang="ts">
import { CircleAlert, Link2Off, Loader2, ShieldCheck } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { focusFirstInvalidControlAfterValidation } from '@/components/admin/form-focus'
import PasswordField from '@/components/admin/PasswordField.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import PasswordStrength from '@/features/account/components/PasswordStrength.vue'
import { PASSWORD_MIN_LENGTH } from '@/features/account/types'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const urlToken = typeof route.params.token === 'string' ? route.params.token : ''
const hasUrlToken = urlToken.length > 0

const isLoading = shallowRef(false)
const resetStatus = shallowRef<'form' | 'invalid' | 'success'>('form')
const hasSubmissionError = shallowRef(false)
const formElement = useTemplateRef<HTMLFormElement>('formElement')
const statusHeading = useTemplateRef<HTMLElement>('statusHeading')

const formSchema = computed(() => {
  const base = z
    .object({
      ...(hasUrlToken
        ? {}
        : {
            token: z
              .string({ required_error: t('auth.resetTokenRequired') })
              .min(1, t('auth.resetTokenRequired')),
          }),
      newPassword: z
        .string({ required_error: t('auth.passwordMinLength', { min: PASSWORD_MIN_LENGTH }) })
        .min(PASSWORD_MIN_LENGTH, t('auth.passwordMinLength', { min: PASSWORD_MIN_LENGTH }))
        .regex(/[A-Z]/, t('account.passwordUppercase'))
        .regex(/[a-z]/, t('account.passwordLowercase'))
        .regex(/\d/, t('account.passwordNumber')),
      confirmPassword: z
        .string({ required_error: t('auth.passwordMinLength', { min: PASSWORD_MIN_LENGTH }) })
        .min(1, t('auth.passwordMinLength', { min: PASSWORD_MIN_LENGTH })),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    })

  return toTypedSchema(base)
})

const { handleSubmit } = useForm({ validationSchema: formSchema })

const onSubmit = handleSubmit(
  async (values) => {
    if (isLoading.value)
      return

    // AI modified: prevent repeated one-time-token consumption while the request is pending.
    hasSubmissionError.value = false
    isLoading.value = true
    const token = hasUrlToken ? urlToken : ((values as Record<string, string>).token ?? '')
    try {
      await authStore.resetPassword(token, values.newPassword)
      resetStatus.value = 'success'
      await nextTick()
      statusHeading.value?.focus()
    }
    catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        // AI modified: expired one-time links become a persistent recovery state instead of a transient toast.
        resetStatus.value = 'invalid'
        await nextTick()
        statusHeading.value?.focus()
      }
      else {
        hasSubmissionError.value = true
      }
    }
    finally {
      isLoading.value = false
    }
  },
  () => void focusFirstInvalidControlAfterValidation(formElement.value),
)

onMounted(() => {
  if (hasUrlToken) {
    // AI modified: retain the token in component memory but remove it from browser history and referrers.
    void router.replace({ name: 'reset-password' })
  }
})
</script>

<template>
  <section class="space-y-6" aria-labelledby="reset-password-heading">
    <div>
      <p class="mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        {{ t('auth.accountRecovery') }}
      </p>
      <h1
        id="reset-password-heading"
        class="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-foreground"
      >
        {{ t('auth.resetPasswordTitle') }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">
        {{ t('auth.resetPasswordSubtitle') }}
      </p>
    </div>

    <!-- AI modified: reset outcomes reuse the same quiet, borderless authentication geometry. -->
    <div v-if="resetStatus === 'success'" class="space-y-6" role="status" aria-live="polite">
      <div class="flex items-start gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <ShieldCheck class="size-5" />
        </div>
        <div class="min-w-0 pt-0.5">
          <h2
            ref="statusHeading"
            tabindex="-1"
            class="text-base font-semibold text-foreground outline-none"
          >
            {{ t('auth.resetPasswordSuccessTitle') }}
          </h2>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            {{ t('auth.resetPasswordSuccessDesc') }}
          </p>
        </div>
      </div>
      <Button as-child size="lg" class="h-11 w-full sm:h-9">
        <RouterLink :to="{ name: 'login' }">
          {{ t('auth.resetPasswordGoToLogin') }}
        </RouterLink>
      </Button>
    </div>

    <div v-else-if="resetStatus === 'invalid'" class="space-y-6" role="alert">
      <div class="flex items-start gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <Link2Off class="size-5" />
        </div>
        <div class="min-w-0 pt-0.5">
          <h2
            ref="statusHeading"
            tabindex="-1"
            class="text-base font-semibold text-foreground outline-none"
          >
            {{ t('auth.resetTokenInvalidTitle') }}
          </h2>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            {{ t('auth.invalidToken') }}
          </p>
        </div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <Button as-child size="lg" class="h-11 sm:h-9">
          <RouterLink :to="{ name: 'forgot-password' }">
            {{ t('auth.requestNewResetLink') }}
          </RouterLink>
        </Button>
        <Button as-child variant="outline" size="lg" class="h-11 sm:h-9">
          <RouterLink :to="{ name: 'login' }">
            {{ t('auth.forgotPasswordBackToLogin') }}
          </RouterLink>
        </Button>
      </div>
    </div>

    <form
      v-else
      ref="formElement"
      class="space-y-4"
      novalidate
      :aria-label="t('auth.resetPasswordFormLabel')"
      :aria-busy="isLoading"
      @submit.prevent="onSubmit"
    >
      <FormField v-if="!hasUrlToken" v-slot="{ componentField }" name="token">
        <FormItem>
          <FormLabel>{{ t('auth.resetToken') }}</FormLabel>
          <FormControl>
            <!-- AI modified: automatic translation cannot rewrite a one-time reset identifier. -->
            <Input
              v-bind="componentField"
              type="text"
              :placeholder="t('auth.resetTokenPlaceholder')"
              autocomplete="off"
              :disabled="isLoading"
              translate="no"
              class="h-11 sm:h-9"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField, value }" name="newPassword">
        <FormItem>
          <FormLabel>{{ t('auth.newPassword') }}</FormLabel>
          <FormControl>
            <PasswordField
              v-bind="componentField"
              :placeholder="t('auth.newPasswordPlaceholder')"
              autocomplete="new-password"
              :disabled="isLoading"
              :show-label="t('auth.showPassword')"
              :hide-label="t('auth.hidePassword')"
              class="h-11 sm:h-9 [&_[data-slot=input-group-control]]:h-full"
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
            <PasswordField
              v-bind="componentField"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
              autocomplete="new-password"
              :disabled="isLoading"
              :show-label="t('auth.showPassword')"
              :hide-label="t('auth.hidePassword')"
              class="h-11 sm:h-9 [&_[data-slot=input-group-control]]:h-full"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <Alert v-if="hasSubmissionError" variant="destructive" aria-live="assertive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>{{ t('auth.resetRequestFailed') }}</AlertTitle>
        <AlertDescription>{{ t('errors.serverError') }}</AlertDescription>
      </Alert>

      <Button type="submit" size="lg" class="h-11 w-full sm:h-9" :disabled="isLoading">
        <Loader2 v-if="isLoading" class="size-4 animate-spin" aria-hidden="true" />
        <span v-if="isLoading" role="status" aria-live="polite">
          {{ t('auth.resetPasswording') }}
        </span>
        <span v-else>{{ t('auth.resetPasswordButton') }}</span>
      </Button>

      <div class="flex flex-col gap-3 pt-1">
        <Separator />
        <div class="flex justify-center">
          <RouterLink
            :to="{ name: 'login' }"
            class="rounded-sm text-xs font-medium text-muted-foreground outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('auth.forgotPasswordBackLink') }}
          </RouterLink>
        </div>
      </div>
    </form>
  </section>
</template>
