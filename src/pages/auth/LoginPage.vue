<script setup lang="ts">
import type { LoginCredentials, LoginField, LoginFormFailure } from '@/features/account/types'
import type { CaptchaChallenge, SsoConfiguration } from '@/types/auth'
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  getPostAuthenticationPath,
  getSafeSsoAuthorizationUrl,
} from '@/features/account/auth-redirect'
import LoginForm from '@/features/account/components/LoginForm.vue'
import SsoLoginButton from '@/features/account/components/SsoLoginButton.vue'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const maxFailedAttempts = 5
const lockDurationSeconds = 30
const isSubmitting = shallowRef(false)
const isCaptchaLoading = shallowRef(false)
const captcha = shallowRef<CaptchaChallenge | null>(null)
const failedAttempts = shallowRef(0)
const lockSecondsRemaining = shallowRef(0)
const submissionFailure = shallowRef<LoginFormFailure | null>(null)
const ssoConfiguration = shallowRef<SsoConfiguration | null>(null)
const isSsoConfigurationLoading = shallowRef(true)
const didSsoConfigurationFail = shallowRef(false)
const isSsoStarting = shallowRef(false)
let failureSequence = 0
let lockUntil = 0
let lockTimer: ReturnType<typeof setInterval> | null = null

const ssoButtonStatus = computed<'disabled' | 'error' | 'loading' | 'ready'>(() => {
  if (isSsoConfigurationLoading.value)
    return 'loading'
  if (didSsoConfigurationFail.value)
    return 'error'
  if (!ssoConfiguration.value?.isEnabled)
    return 'disabled'
  return 'ready'
})

function startLockCountdown() {
  lockUntil = Date.now() + lockDurationSeconds * 1000
  lockSecondsRemaining.value = lockDurationSeconds
  if (lockTimer) {
    clearInterval(lockTimer)
  }

  lockTimer = setInterval(() => {
    lockSecondsRemaining.value = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000))
    if (lockSecondsRemaining.value === 0) {
      failedAttempts.value = 0
      if (lockTimer) {
        clearInterval(lockTimer)
      }
      lockTimer = null
    }
  }, 500)
}

async function refreshCaptcha(): Promise<void> {
  if (isCaptchaLoading.value) {
    return
  }

  isCaptchaLoading.value = true
  try {
    captcha.value = await authStore.getCaptcha()
  }
  catch (error: unknown) {
    captcha.value = null
    toast.error(t('auth.captchaUnavailable'), {
      description: error instanceof Error ? error.message : t('errors.serverError'),
    })
  }
  finally {
    isCaptchaLoading.value = false
  }
}

async function refreshSsoConfiguration(): Promise<void> {
  if (isSsoConfigurationLoading.value && ssoConfiguration.value)
    return

  isSsoConfigurationLoading.value = true
  didSsoConfigurationFail.value = false
  try {
    ssoConfiguration.value = await authStore.getSsoConfiguration()
  }
  catch {
    // AI modified: SSO discovery failures stay recoverable without blocking password login.
    ssoConfiguration.value = null
    didSsoConfigurationFail.value = true
  }
  finally {
    isSsoConfigurationLoading.value = false
  }
}

async function startSsoLogin(): Promise<void> {
  if (isSsoStarting.value || ssoButtonStatus.value !== 'ready')
    return

  isSsoStarting.value = true
  try {
    const start = await authStore.startSsoLogin(getPostAuthenticationPath(route.query.redirect))
    const authorizationUrl = getSafeSsoAuthorizationUrl(start.authorizationUrl)
    if (!authorizationUrl || start.expiresAt <= Date.now()) {
      throw new Error('Invalid or expired SSO authorization transaction')
    }
    // AI modified: the backend creates the transaction before the browser leaves the login page.
    window.location.assign(authorizationUrl)
  }
  catch (error: unknown) {
    const isConfigurationDisabled = error instanceof ApiError && error.code === 'SSO_NOT_CONFIGURED'
    if (isConfigurationDisabled)
      await refreshSsoConfiguration()
    toast.error(t('auth.ssoStartFailed'), {
      description: t(isConfigurationDisabled ? 'auth.ssoNotConfigured' : 'auth.ssoGenericFailure'),
    })
  }
  finally {
    isSsoStarting.value = false
  }
}

function getLoginFailure(error: unknown): {
  field?: LoginField
  message: string
  shouldCountAttempt: boolean
} {
  if (!(error instanceof ApiError)) {
    return { message: t('errors.networkError'), shouldCountAttempt: false }
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      // AI modified: show one generic field error without revealing which credential failed.
      return {
        field: 'password',
        message: t('auth.invalidCredentials'),
        shouldCountAttempt: true,
      }
    case 'INVALID_CAPTCHA':
      return { field: 'captchaCode', message: error.message, shouldCountAttempt: true }
    case 'LOGIN_LOCKED':
      return { message: error.message, shouldCountAttempt: true }
    default:
      return { message: error.message, shouldCountAttempt: false }
  }
}

async function login(credentials: LoginCredentials): Promise<void> {
  if (isSubmitting.value || lockSecondsRemaining.value > 0 || !captcha.value) {
    return
  }

  // AI modified: stale form-level feedback is cleared while the current request owns the form.
  submissionFailure.value = null
  isSubmitting.value = true
  const captchaId = captcha.value.captchaId

  try {
    const didAuthenticate = await authStore.login(credentials.email, credentials.password, {
      captchaId,
      captchaCode: credentials.captchaCode,
      provider: 'password',
    })
    // AI modified: a superseded login finishes silently while the newest attempt owns the UI/session.
    if (!didAuthenticate)
      return
    failedAttempts.value = 0
    toast.success(t('auth.loginSuccess'), {
      description: t('auth.loginSuccessDesc', { name: authStore.user?.name }),
    })
    await router.push(getPostAuthenticationPath(route.query.redirect))
  }
  catch (error: unknown) {
    const failure = getLoginFailure(error)
    if (failure.shouldCountAttempt)
      failedAttempts.value += 1
    const { shouldCountAttempt, ...formFailure } = failure
    submissionFailure.value = { id: ++failureSequence, ...formFailure }

    if (shouldCountAttempt && failedAttempts.value >= maxFailedAttempts) {
      // AI modified: transport and server outages never consume the user's credential-attempt budget.
      startLockCountdown()
      toast.error(t('auth.lockoutTitle'), {
        description: t('auth.lockoutDesc', {
          max: maxFailedAttempts,
          seconds: lockDurationSeconds,
        }),
      })
    }

    // AI modified: every failed login consumes the challenge and requests a fresh one.
    await refreshCaptcha()
  }
  finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void refreshCaptcha()
  void refreshSsoConfiguration()
})

onUnmounted(() => {
  if (lockTimer) {
    clearInterval(lockTimer)
  }
})
</script>

<template>
  <section class="space-y-6" aria-labelledby="login-heading">
    <div>
      <p class="mb-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
        {{ t('auth.secureAccess') }}
      </p>
      <h1
        id="login-heading"
        class="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-foreground"
      >
        {{ t('auth.welcomeBack') }}
      </h1>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">
        {{ t('auth.loginSubtitle') }}
      </p>
    </div>

    <LoginForm
      :captcha="captcha"
      :is-captcha-loading="isCaptchaLoading"
      :is-submitting="isSubmitting"
      :failed-attempts="failedAttempts"
      :max-attempts="maxFailedAttempts"
      :lock-seconds-remaining="lockSecondsRemaining"
      :submission-failure="submissionFailure"
      @submit="login"
      @refresh-captcha="refreshCaptcha"
    />

    <SsoLoginButton
      :provider-name="ssoConfiguration?.providerName ?? t('auth.ssoDefaultProvider')"
      :is-starting="isSsoStarting"
      :status="ssoButtonStatus"
      @retry="refreshSsoConfiguration"
      @start="startSsoLogin"
    />
  </section>
</template>
