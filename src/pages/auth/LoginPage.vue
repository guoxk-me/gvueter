<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'
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

const showPassword = ref(false)
const isLoading = ref(false)

// ── 连续失败锁定 ───────────────────────────────────────────────────────────────
const MAX_FAIL = 5
const LOCK_SECONDS = 30
const failCount = ref(0)
const lockUntil = ref(0)
const lockCountdown = ref(0)
let lockTimer: ReturnType<typeof setInterval> | null = null

function isLocked() {
  return Date.now() < lockUntil.value
}

function startLockCountdown() {
  lockCountdown.value = Math.ceil((lockUntil.value - Date.now()) / 1000)
  lockTimer = setInterval(() => {
    lockCountdown.value = Math.ceil((lockUntil.value - Date.now()) / 1000)
    if (lockCountdown.value <= 0) {
      lockCountdown.value = 0
      clearInterval(lockTimer!)
      lockTimer = null
    }
  }, 500)
}

onUnmounted(() => {
  if (lockTimer) clearInterval(lockTimer)
})

// ── 表单 schema ───────────────────────────────────────────────────────────────
// Fix 1: required_error 处理字段为 undefined 的情况，避免出现 vee-validate 默认 "Required"
// 用普通常量而非 computed，避免 vee-validate watch 动态 schema 时引发 render 阶段副作用
const PASSWORD_MIN = 6

const formSchema = toTypedSchema(
  z.object({
    email: z
      .string({ required_error: t('auth.emailRequired') })
      .min(1, t('auth.emailRequired'))
      .email(t('auth.emailInvalid')),
    password: z
      .string({ required_error: t('auth.passwordMinLength', { min: PASSWORD_MIN }) })
      .min(PASSWORD_MIN, t('auth.passwordMinLength', { min: PASSWORD_MIN })),
  }),
)

// Fix 3: 解构 setFieldError，将服务端错误注入 vee-validate 字段上下文
//        这样 <FormMessage> 能正确读取并渲染错误文字
const { handleSubmit, setFieldError } = useForm({ validationSchema: formSchema })

// ── 提交 ──────────────────────────────────────────────────────────────────────
const onSubmit = handleSubmit(async (values) => {
  if (isLocked()) return

  isLoading.value = true

  try {
    await authStore.login(values.email, values.password)
    failCount.value = 0
    toast.success(t('auth.loginSuccess'), {
      description: t('auth.loginSuccessDesc', { name: authStore.user?.name }),
    })
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.push(redirect)
  } catch (err) {
    failCount.value++

    if (failCount.value >= MAX_FAIL) {
      lockUntil.value = Date.now() + LOCK_SECONDS * 1000
      failCount.value = 0
      startLockCountdown()
      toast.error(t('auth.lockoutTitle'), {
        description: t('auth.lockoutDesc', { max: MAX_FAIL, seconds: LOCK_SECONDS }),
      })
      return
    }

    if (err instanceof ApiError) {
      switch (err.code) {
        case 'USER_NOT_FOUND':
          setFieldError('email', t('auth.userNotFound'))
          break
        case 'WRONG_PASSWORD':
          setFieldError('password', t('auth.wrongPassword'))
          break
        default:
          toast.error(t('auth.loginFailed'), { description: err.message })
      }
    } else {
      toast.error(t('errors.networkError'), {
        description: t('errors.serverError'),
      })
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="w-full max-w-sm space-y-8">
      <!-- Logo & Title -->
      <div class="text-center">
        <div
          class="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <svg
            class="size-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">
          {{ t('auth.welcomeBack') }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('auth.loginSubtitle') }}</p>
      </div>

      <!-- Card -->
      <!-- novalidate: Fix 2 — 禁用浏览器原生 HTML5 校验，让 vee-validate+zod 接管 -->
      <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <form class="space-y-4" novalidate @submit.prevent="onSubmit">
          <!-- Email -->
          <!-- Fix: 使用 <FormField> 包裹，提供 FieldContextKey 给子组件 useFormField() -->
          <FormField name="email" v-slot="{ componentField }">
            <FormItem>
              <FormLabel>{{ t('auth.email') }}</FormLabel>
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="email"
                  :placeholder="t('auth.emailPlaceholder')"
                  autocomplete="email"
                  :disabled="isLoading || isLocked()"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Password -->
          <FormField name="password" v-slot="{ componentField }">
            <FormItem>
              <div class="flex items-center justify-between">
                <FormLabel>{{ t('auth.password') }}</FormLabel>
                <a
                  href="#"
                  class="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  tabindex="-1"
                  @click.prevent="
                    toast.info(t('auth.forgotPasswordTitle'), {
                      description: t('auth.forgotPasswordDesc'),
                    })
                  "
                >
                  {{ t('auth.forgotPassword') }}
                </a>
              </div>
              <FormControl>
                <div class="relative">
                  <Input
                    v-bind="componentField"
                    :type="showPassword ? 'text' : 'password'"
                    :placeholder="t('auth.passwordPlaceholder')"
                    autocomplete="current-password"
                    class="pr-10"
                    :disabled="isLoading || isLocked()"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    tabindex="-1"
                    @click="showPassword = !showPassword"
                  >
                    <EyeOff v-if="showPassword" class="size-4" />
                    <Eye v-else class="size-4" />
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- 失败次数提示 -->
          <p v-if="failCount > 0 && !isLocked()" class="text-xs text-muted-foreground">
            {{ t('auth.failCountHint', { count: failCount, remaining: MAX_FAIL - failCount }) }}
          </p>

          <!-- Submit -->
          <Button type="submit" class="w-full" :disabled="isLoading || isLocked()">
            <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" />
            <span v-if="isLocked()">{{
              t('auth.lockoutCountdown', { seconds: lockCountdown })
            }}</span>
            <span v-else-if="isLoading">{{ t('auth.loggingIn') }}</span>
            <span v-else>{{ t('auth.loginButton') }}</span>
          </Button>
        </form>
      </div>

      <p class="text-center text-xs text-muted-foreground">
        &copy; {{ new Date().getFullYear() }} Admin Panel. All rights reserved.
      </p>
    </div>
  </div>
</template>
