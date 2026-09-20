<script setup lang="ts">
import type { LoginCredentials, LoginFormFailure } from '@/features/account/types'
import type { CaptchaChallenge } from '@/types/auth'
import { CircleAlert, Loader2, LockKeyhole, RefreshCw } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { focusFirstInvalidControlAfterValidation } from '@/components/admin/form-focus'
import PasswordField from '@/components/admin/PasswordField.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import CaptchaField from './CaptchaField.vue'

const props = withDefaults(
  defineProps<{
    captcha: CaptchaChallenge | null
    isCaptchaLoading?: boolean
    isSubmitting?: boolean
    failedAttempts?: number
    maxAttempts?: number
    lockSecondsRemaining?: number
    submissionFailure?: LoginFormFailure | null
  }>(),
  {
    isCaptchaLoading: false,
    isSubmitting: false,
    failedAttempts: 0,
    maxAttempts: 5,
    lockSecondsRemaining: 0,
    submissionFailure: null,
  },
)

const emit = defineEmits<{
  submit: [credentials: LoginCredentials]
  refreshCaptcha: []
}>()

const { t } = useI18n()
const passwordMinLength = 6
const formElement = useTemplateRef<HTMLFormElement>('formElement')

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      email: z
        .string({ required_error: t('auth.emailRequired') })
        .trim()
        .min(1, t('auth.emailRequired'))
        .email(t('auth.emailInvalid')),
      password: z
        .string({ required_error: t('auth.passwordMinLength', { min: passwordMinLength }) })
        .min(passwordMinLength, t('auth.passwordMinLength', { min: passwordMinLength })),
      captchaCode: z
        .string({ required_error: t('auth.captchaRequired') })
        .trim()
        .min(1, t('auth.captchaRequired')),
    }),
  ),
)

const { handleSubmit, setFieldError, setFieldValue } = useForm<LoginCredentials>({
  validationSchema,
  initialValues: {
    email: '',
    password: '',
    captchaCode: '',
  },
})

const isLocked = computed(() => props.lockSecondsRemaining > 0)
const isDisabled = computed(
  () => props.isSubmitting || props.isCaptchaLoading || isLocked.value || !props.captcha,
)

watch(
  () => props.captcha?.captchaId,
  // AI modified: a new challenge clears its answer without erasing server-side field errors.
  () => setFieldValue('captchaCode', '', false),
)

watch(
  () => props.submissionFailure,
  (failure) => {
    if (failure?.field) {
      setFieldError(failure.field, failure.message)
    }
  },
)

const submitCredentials = handleSubmit(
  (credentials) => {
    if (isDisabled.value) {
      return
    }

    // AI modified: the form emits validated credentials while the page owns authentication effects.
    emit('submit', credentials)
  },
  () => void focusFirstInvalidControlAfterValidation(formElement.value),
)
</script>

<template>
  <form
    ref="formElement"
    class="space-y-4"
    novalidate
    :aria-label="t('auth.loginFormLabel')"
    :aria-busy="isSubmitting"
    @submit.prevent="submitCredentials"
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
            :disabled="isDisabled"
            class="h-11 sm:h-9"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="password">
      <FormItem>
        <div class="flex items-center justify-between gap-4">
          <FormLabel>{{ t('auth.password') }}</FormLabel>
          <RouterLink
            :to="{ name: 'forgot-password' }"
            class="text-xs font-medium text-primary outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('auth.forgotPassword') }}
          </RouterLink>
        </div>
        <FormControl>
          <PasswordField
            v-bind="componentField"
            :placeholder="t('auth.passwordPlaceholder')"
            autocomplete="current-password"
            :disabled="isDisabled"
            :show-label="t('auth.showPassword')"
            :hide-label="t('auth.hidePassword')"
            class="h-11 sm:h-9 [&_[data-slot=input-group-control]]:h-full"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ value, handleChange }" name="captchaCode">
      <FormItem>
        <FormLabel>{{ t('auth.captcha') }}</FormLabel>
        <FormControl v-if="captcha">
          <CaptchaField
            :model-value="String(value ?? '')"
            :challenge="captcha.challenge"
            :is-refreshing="isCaptchaLoading"
            :disabled="isSubmitting || isLocked"
            @update:model-value="handleChange"
            @refresh="emit('refreshCaptcha')"
          />
        </FormControl>
        <div
          v-else
          role="status"
          class="flex items-center justify-between gap-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
        >
          <span>{{ t('auth.captchaUnavailable') }}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="isCaptchaLoading || isSubmitting || isLocked"
            @click="emit('refreshCaptcha')"
          >
            <RefreshCw
              class="mr-2 size-3.5"
              :class="{ 'animate-spin': isCaptchaLoading }"
              aria-hidden="true"
            />
            {{ t('auth.refreshCaptcha') }}
          </Button>
        </div>
        <FormMessage />
      </FormItem>
    </FormField>

    <p
      v-if="failedAttempts > 0 && !isLocked"
      role="status"
      aria-live="polite"
      class="text-xs text-muted-foreground"
    >
      {{
        t('auth.failCountHint', {
          count: failedAttempts,
          remaining: Math.max(maxAttempts - failedAttempts, 0),
        })
      }}
    </p>

    <Alert v-if="isLocked" class="bg-warning-muted/45 text-foreground">
      <LockKeyhole aria-hidden="true" class="text-warning" />
      <AlertTitle>{{ t('auth.lockoutTitle') }}</AlertTitle>
      <AlertDescription>
        {{ t('auth.lockoutCountdown', { seconds: lockSecondsRemaining }) }}
      </AlertDescription>
    </Alert>

    <Alert
      v-else-if="submissionFailure && !submissionFailure.field"
      variant="destructive"
      aria-live="assertive"
    >
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{{ t('auth.loginRequestFailed') }}</AlertTitle>
      <AlertDescription>{{ submissionFailure.message }}</AlertDescription>
    </Alert>

    <Button type="submit" size="lg" class="h-11 w-full sm:h-9" :disabled="isDisabled">
      <Loader2 v-if="isSubmitting" class="size-4 animate-spin" aria-hidden="true" />
      <span v-if="isLocked" role="status" aria-live="assertive">
        {{ t('auth.lockoutCountdown', { seconds: lockSecondsRemaining }) }}
      </span>
      <span v-else-if="isSubmitting" role="status" aria-live="polite">
        {{ t('auth.loggingIn') }}
      </span>
      <span v-else>{{ t('auth.loginButton') }}</span>
    </Button>
  </form>
</template>
