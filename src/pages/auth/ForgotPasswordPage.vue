<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { MailCheck, Loader2, Sun, Moon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/http'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormItem, FormLabel, FormControl, FormMessage, FormField } from '@/components/ui/form'
import { useTheme } from '@/composables/useTheme'
import { setLocale, type SupportedLocale } from '@/i18n'

const { t, locale } = useI18n()
const { isDark, toggleTheme } = useTheme()
const router = useRouter()
const authStore = useAuthStore()

// ── 语言切换 ──────────────────────────────────────────────────────────────────
const localeLabel = computed(() => (locale.value === 'zh-CN' ? 'EN' : '中'))
const localeSwitchAriaLabel = computed(() =>
  locale.value === 'zh-CN' ? t('common.switchToEn') : t('common.switchToZh'),
)

function toggleLocale() {
  const next: SupportedLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLocale(next)
}

const themeAriaLabel = computed(() => (isDark.value ? t('common.lightMode') : t('common.darkMode')))

// ── 状态 ──────────────────────────────────────────────────────────────────────
const isLoading = ref(false)
const isSuccess = ref(false)
const sentEmail = ref('')

// ── 邮箱脱敏展示（user@example.com → u***@example.com） ──────────────────────
const maskedEmail = computed(() => {
  const email = sentEmail.value
  const atIdx = email.indexOf('@')
  if (atIdx <= 1) return email
  return email[0] + '***' + email.slice(atIdx)
})

// ── 表单 schema ───────────────────────────────────────────────────────────────
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

// ── 提交 ──────────────────────────────────────────────────────────────────────
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
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="w-full max-w-sm space-y-6">
      <!-- Logo & Title -->
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

      <!-- Card -->
      <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <!-- ── 成功状态 ─────────────────────────────────────────────────────── -->
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

        <!-- ── 表单状态 ─────────────────────────────────────────────────────── -->
        <form
          v-else
          class="space-y-4"
          novalidate
          :aria-label="t('auth.forgotPasswordFormLabel')"
          @submit.prevent="onSubmit"
        >
          <!-- Email -->
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

          <!-- Submit -->
          <Button type="submit" class="w-full" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" aria-hidden="true" />
            <span v-if="isLoading">{{ t('auth.forgotPasswordSending') }}</span>
            <span v-else>{{ t('auth.forgotPasswordSendButton') }}</span>
          </Button>
        </form>
      </div>

      <!-- 返回登录 -->
      <p v-if="!isSuccess" class="text-center text-sm text-muted-foreground">
        <a
          href="#"
          class="hover:text-foreground hover:underline"
          @click.prevent="router.push({ name: 'login' })"
        >
          {{ t('auth.forgotPasswordBackLink') }}
        </a>
      </p>

      <!-- 工具栏 -->
      <div class="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          :aria-label="themeAriaLabel"
          :aria-pressed="isDark"
          @click="toggleTheme($event)"
        >
          <Sun v-if="isDark" class="size-4" aria-hidden="true" />
          <Moon v-else class="size-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          class="w-10 text-sm font-medium"
          :aria-label="localeSwitchAriaLabel"
          :lang="locale === 'zh-CN' ? 'en' : 'zh-CN'"
          @click="toggleLocale"
        >
          {{ localeLabel }}
        </Button>
      </div>

      <!-- 版权 -->
      <p class="text-center text-xs text-muted-foreground">
        {{ t('common.copyright', { year: new Date().getFullYear() }) }}
      </p>
    </div>
  </div>
</template>
