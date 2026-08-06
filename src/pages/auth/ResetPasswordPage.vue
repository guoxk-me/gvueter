<script setup lang="ts">
import { Eye, EyeOff, Loader2, ShieldCheck } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { focusFirstInvalidControlAfterValidation } from '@/components/admin/form-focus'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
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

const isLoading = ref(false)
const isSuccess = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)
const formElement = useTemplateRef<HTMLFormElement>('formElement')
const successHeading = useTemplateRef<HTMLElement>('successHeading')

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
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    })

  return toTypedSchema(base)
})

const { handleSubmit } = useForm({ validationSchema: formSchema })

const onSubmit = handleSubmit(
  async (values) => {
    if (isLoading.value) return

    // AI modified: prevent repeated one-time-token consumption while the request is pending.
    isLoading.value = true
    const token = hasUrlToken ? urlToken : ((values as Record<string, string>).token ?? '')
    try {
      await authStore.resetPassword(token, values.newPassword)
      isSuccess.value = true
      await nextTick()
      successHeading.value?.focus()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        toast.error(t('auth.invalidToken'))
      } else {
        toast.error(t('errors.serverError'))
      }
    } finally {
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
        {{ t('auth.resetPasswordTitle') }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ t('auth.resetPasswordSubtitle') }}
      </p>
    </div>

    <div class="rounded-xl border border-border bg-card p-8 shadow-sm">
      <div v-if="isSuccess" class="flex flex-col items-center gap-4 py-2 text-center">
        <div
          class="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <ShieldCheck class="size-7" aria-hidden="true" />
        </div>
        <div>
          <h2 ref="successHeading" tabindex="-1" class="font-semibold text-foreground outline-none">
            {{ t('auth.resetPasswordSuccessTitle') }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('auth.resetPasswordSuccessDesc') }}
          </p>
        </div>
        <Button as-child class="w-full">
          <RouterLink :to="{ name: 'login' }">
            {{ t('auth.resetPasswordGoToLogin') }}
          </RouterLink>
        </Button>
      </div>

      <form
        v-else
        ref="formElement"
        class="space-y-4"
        novalidate
        :aria-label="t('auth.resetPasswordFormLabel')"
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
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField, value }" name="newPassword">
          <FormItem>
            <FormLabel>{{ t('auth.newPassword') }}</FormLabel>
            <FormControl>
              <div class="relative">
                <Input
                  id="new-password-input"
                  v-bind="componentField"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="t('auth.newPasswordPlaceholder')"
                  autocomplete="new-password"
                  class="pr-10"
                  :disabled="isLoading"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  :title="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  aria-controls="new-password-input"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="size-4" aria-hidden="true" />
                  <Eye v-else class="size-4" aria-hidden="true" />
                </button>
              </div>
            </FormControl>
            <PasswordStrength :password="String(value ?? '')" />
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ componentField }" name="confirmPassword">
          <FormItem>
            <FormLabel>{{ t('auth.confirmPassword') }}</FormLabel>
            <FormControl>
              <div class="relative">
                <Input
                  id="confirm-password-input"
                  v-bind="componentField"
                  :type="showConfirm ? 'text' : 'password'"
                  :placeholder="t('auth.confirmPasswordPlaceholder')"
                  autocomplete="new-password"
                  class="pr-10"
                  :disabled="isLoading"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  :aria-label="showConfirm ? t('auth.hidePassword') : t('auth.showPassword')"
                  :title="showConfirm ? t('auth.hidePassword') : t('auth.showPassword')"
                  aria-controls="confirm-password-input"
                  :aria-pressed="showConfirm"
                  @click="showConfirm = !showConfirm"
                >
                  <EyeOff v-if="showConfirm" class="size-4" aria-hidden="true" />
                  <Eye v-else class="size-4" aria-hidden="true" />
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <Button type="submit" class="w-full" :disabled="isLoading">
          <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" aria-hidden="true" />
          <span v-if="isLoading">{{ t('auth.resetPasswording') }}</span>
          <span v-else>{{ t('auth.resetPasswordButton') }}</span>
        </Button>

        <div class="pt-1">
          <div class="mb-3 border-t border-border" />
          <div class="flex justify-center">
            <RouterLink
              :to="{ name: 'login' }"
              class="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {{ t('auth.forgotPasswordBackLink') }}
            </RouterLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
