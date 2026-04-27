<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from '@/components/ui/form'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const urlToken = (route.params.token as string) || ''
const hasUrlToken = urlToken.length > 0

const isLoading = ref(false)
const isSuccess = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const PASSWORD_MIN = 6

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
        .string({ required_error: t('auth.passwordMinLength', { min: PASSWORD_MIN }) })
        .min(PASSWORD_MIN, t('auth.passwordMinLength', { min: PASSWORD_MIN })),
      confirmPassword: z
        .string({ required_error: t('auth.passwordMinLength', { min: PASSWORD_MIN }) })
        .min(1, t('auth.passwordMinLength', { min: PASSWORD_MIN })),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('auth.passwordMismatch'),
      path: ['confirmPassword'],
    })

  return toTypedSchema(base)
})

const { handleSubmit } = useForm({ validationSchema: formSchema })

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  const token = hasUrlToken ? urlToken : ((values as Record<string, string>).token ?? '')
  try {
    await authStore.resetPassword(token, values.newPassword)
    isSuccess.value = true
  } catch (err) {
    if (err instanceof ApiError && err.code === 'INVALID_TOKEN') {
      toast.error(t('auth.invalidToken'))
    } else {
      toast.error(t('errors.serverError'))
    }
  } finally {
    isLoading.value = false
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
          <p class="font-semibold text-foreground">{{ t('auth.resetPasswordSuccessTitle') }}</p>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('auth.resetPasswordSuccessDesc') }}
          </p>
        </div>
        <Button class="w-full" @click="router.push({ name: 'login' })">
          {{ t('auth.resetPasswordGoToLogin') }}
        </Button>
      </div>

      <form
        v-else
        class="space-y-4"
        novalidate
        :aria-label="t('auth.resetPasswordFormLabel')"
        @submit.prevent="onSubmit"
      >
        <FormField v-if="!hasUrlToken" name="token" v-slot="{ componentField }">
          <FormItem>
            <FormLabel>{{ t('auth.resetToken') }}</FormLabel>
            <FormControl>
              <Input
                v-bind="componentField"
                type="text"
                :placeholder="t('auth.resetTokenPlaceholder')"
                autocomplete="off"
                :disabled="isLoading"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="newPassword" v-slot="{ componentField }">
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
                  aria-controls="new-password-input"
                  :aria-pressed="showPassword"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="size-4" aria-hidden="true" />
                  <Eye v-else class="size-4" aria-hidden="true" />
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="confirmPassword" v-slot="{ componentField }">
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
            <a
              href="#"
              class="text-xs text-muted-foreground hover:text-foreground hover:underline"
              @click.prevent="router.push({ name: 'login' })"
            >
              {{ t('auth.forgotPasswordBackLink') }}
            </a>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
