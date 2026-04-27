<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { MailCheck, Loader2 } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from '@/components/ui/form'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const isSuccess = ref(false)
const sentEmail = ref('')

const maskedEmail = computed(() => {
  const email = sentEmail.value
  const atIdx = email.indexOf('@')
  if (atIdx <= 1) return email
  return email[0] + '***' + email.slice(atIdx)
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

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    await authStore.forgotPassword(values.email)
    sentEmail.value = values.email
    isSuccess.value = true
  } catch (err) {
    if (err instanceof ApiError && err.code === 'USER_NOT_FOUND') {
      setFieldError('email', t('auth.userNotFound'))
    } else {
      setFieldError('email', t('errors.serverError'))
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
          <p class="font-semibold text-foreground">{{ t('auth.forgotPasswordSuccessTitle') }}</p>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('auth.forgotPasswordSuccessDesc', { email: maskedEmail }) }}
          </p>
        </div>
        <Button class="w-full" @click="router.push({ name: 'login' })">
          {{ t('auth.forgotPasswordBackToLogin') }}
        </Button>
      </div>

      <form
        v-else
        class="space-y-4"
        novalidate
        :aria-label="t('auth.forgotPasswordFormLabel')"
        @submit.prevent="onSubmit"
      >
        <FormField name="email" v-slot="{ componentField }">
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
      <a
        href="#"
        class="hover:text-foreground hover:underline"
        @click.prevent="router.push({ name: 'login' })"
      >
        {{ t('auth.forgotPasswordBackLink') }}
      </a>
    </p>
  </div>
</template>
