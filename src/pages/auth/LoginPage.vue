<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Eye, EyeOff, Loader2, Sun, Moon } from 'lucide-vue-next'
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
const route = useRoute()
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

// ── 主题切换 aria-label ───────────────────────────────────────────────────────
const themeAriaLabel = computed(() => (isDark.value ? t('common.lightMode') : t('common.darkMode')))

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

// ── 表单 schema（computed 以响应语言切换）────────────────────────────────────
const PASSWORD_MIN = 6

const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      email: z
        .string({ required_error: t('auth.emailRequired') })
        .min(1, t('auth.emailRequired'))
        .email(t('auth.emailInvalid')),
      password: z
        .string({ required_error: t('auth.passwordMinLength', { min: PASSWORD_MIN }) })
        .min(PASSWORD_MIN, t('auth.passwordMinLength', { min: PASSWORD_MIN })),
    }),
  ),
)

// Fix: 解构 setFieldError，将服务端错误注入 vee-validate 字段上下文
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
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="rounded-xl border border-border bg-card p-8 shadow-sm space-y-6">
        <!-- Logo & Title -->
        <div class="text-center">
          <!--
            aria-hidden: 纯装饰性 SVG，屏幕阅读器跳过，避免播报无意义路径字符串
          -->
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
            {{ t('auth.welcomeBack') }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">{{ t('auth.loginSubtitle') }}</p>
        </div>

        <!--
          aria-label: 为表单添加语义标签，辅助技术（如屏幕阅读器）能宣告表单用途
          novalidate: 禁用浏览器原生校验，由 vee-validate + zod 接管
        -->
        <form
          class="space-y-4"
          novalidate
          :aria-label="t('auth.loginFormLabel')"
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
                  :disabled="isLoading || isLocked()"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Password -->
          <FormField name="password" v-slot="{ componentField }">
            <FormItem>
              <FormLabel>{{ t('auth.password') }}</FormLabel>
              <FormControl>
                <div class="relative">
                  <!--
                    id="password-input": 供密码显示切换按钮的 aria-controls 引用
                  -->
                  <Input
                    id="password-input"
                    v-bind="componentField"
                    :type="showPassword ? 'text' : 'password'"
                    :placeholder="t('auth.passwordPlaceholder')"
                    autocomplete="current-password"
                    class="pr-10"
                    :disabled="isLoading || isLocked()"
                  />
                  <!--
                    aria-label: 根据当前状态动态描述操作意图，避免仅用图标而无文字说明
                    aria-controls: 指向被控制的密码输入框，建立控件关联
                    aria-pressed: 表达当前"密码可见"状态，供开关类控件使用
                  -->
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                    aria-controls="password-input"
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

          <!--
            失败次数提示
            role="status" + aria-live="polite": 动态内容变化时，屏幕阅读器会在
            当前朗读结束后礼貌地宣告新内容，不打断用户操作
          -->
          <p
            v-if="failCount > 0 && !isLocked()"
            role="status"
            aria-live="polite"
            class="text-xs text-muted-foreground"
          >
            {{ t('auth.failCountHint', { count: failCount, remaining: MAX_FAIL - failCount }) }}
          </p>

          <!-- Submit -->
          <Button type="submit" class="w-full" :disabled="isLoading || isLocked()">
            <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" aria-hidden="true" />
            <!--
              锁定倒计时：aria-live="assertive" 立即宣告，因为这是阻断性状态，
              用户需要立刻得知需要等待。
            -->
            <span v-if="isLocked()" role="status" aria-live="assertive">
              {{ t('auth.lockoutCountdown', { seconds: lockCountdown }) }}
            </span>
            <span v-else-if="isLoading">{{ t('auth.loggingIn') }}</span>
            <span v-else>{{ t('auth.loginButton') }}</span>
          </Button>

          <!-- 分割线 + 密码相关入口 -->
          <div class="pt-1">
            <div class="mb-3 border-t border-border" />
            <div class="flex items-center justify-between">
              <a
                href="#"
                class="text-xs text-muted-foreground hover:text-foreground hover:underline"
                @click.prevent="router.push({ name: 'forgot-password' })"
              >
                {{ t('auth.forgotPassword') }}
              </a>
              <a
                href="#"
                class="text-xs text-muted-foreground hover:text-foreground hover:underline"
                @click.prevent="router.push({ name: 'reset-password', params: { token: '' } })"
              >
                {{ t('auth.resetPasswordTitle') }}
              </a>
            </div>
          </div>
        </form>

        <!-- 工具栏：主题切换 + 语言切换 -->
        <div class="flex items-center justify-center gap-1">
          <!--
            aria-label: 使用 computed 以响应语言切换，始终以当前语言描述操作
            aria-pressed: 语义上是一个双态切换按钮，true = 当前为暗色模式
            @click="toggleTheme($event)": 传入 MouseEvent 以实现从点击位置扩散的动画
          -->
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

          <!--
            aria-label: 描述切换目标语言，比"切换语言"更具体，辅助技术用户能预判结果
            lang: 标注按钮内文字所用语言，避免屏幕阅读器以当前页面语言发音
          -->
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
  </div>
</template>
