<script setup lang="ts">
import { CircleAlert, Loader2 } from '@lucide/vue'
import { nextTick, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { getPostAuthenticationPath } from '@/features/account/auth-redirect'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'

type SsoCallbackOutcome = { status: 'error', reason: string } | { status: 'ticket', ticket: string }

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const callbackStatus = ref<'exchanging' | 'failed'>('exchanging')
const failureMessageKey = ref('auth.ssoGenericFailure')
const failureHeading = useTemplateRef<HTMLElement>('failureHeading')

function getSsoCallbackOutcome(fragment: string): SsoCallbackOutcome {
  if (!fragment.startsWith('#'))
    return { status: 'error', reason: 'invalid_ticket' }

  const parameters = new URLSearchParams(fragment.slice(1))
  const tickets = parameters.getAll('ticket')
  const errors = parameters.getAll('error')
  if (tickets.length === 1 && errors.length === 0) {
    const ticket = tickets[0]?.trim() ?? ''
    if (ticket && ticket.length <= 2048)
      return { status: 'ticket', ticket }
  }
  if (errors.length === 1 && tickets.length === 0) {
    return { status: 'error', reason: errors[0] ?? 'provider_error' }
  }
  return { status: 'error', reason: 'invalid_ticket' }
}

function getFailureMessageKey(reason: string): string {
  if (reason === 'access_denied')
    return 'auth.ssoAccessDenied'
  if (reason === 'not_configured')
    return 'auth.ssoNotConfigured'
  if (reason === 'account_unavailable')
    return 'auth.ssoAccountUnavailable'
  if (reason === 'invalid_ticket')
    return 'auth.ssoInvalidTicket'
  return 'auth.ssoGenericFailure'
}

async function showFailure(messageKey: string): Promise<void> {
  failureMessageKey.value = messageKey
  callbackStatus.value = 'failed'
  await nextTick()
  failureHeading.value?.focus()
}

async function completeSsoLogin(): Promise<void> {
  const outcome = getSsoCallbackOutcome(route.hash)
  // AI modified: capture the one-time fragment in memory, then remove it before any exchange UI renders.
  await router.replace({ name: 'sso-callback' })

  if (authStore.isAuthenticated) {
    await router.replace('/dashboard')
    return
  }
  if (outcome.status === 'error') {
    await showFailure(getFailureMessageKey(outcome.reason))
    return
  }

  try {
    const redirectPath = await authStore.exchangeSsoTicket(outcome.ticket)
    if (!redirectPath) {
      if (authStore.isAuthenticated)
        await router.replace('/dashboard')
      else await showFailure('auth.ssoGenericFailure')
      return
    }
    toast.success(t('auth.loginSuccess'), {
      description: t('auth.loginSuccessDesc', { name: authStore.user?.name }),
    })
    await router.replace(getPostAuthenticationPath(redirectPath))
  }
  catch (error: unknown) {
    if (error instanceof ApiError && error.code === 'SSO_SESSION_ACTIVE') {
      await router.replace('/dashboard')
      return
    }
    if (
      error instanceof ApiError
      && (error.code === 'SSO_TICKET_EXPIRED' || error.code === 'SSO_TICKET_INVALID')
    ) {
      await showFailure('auth.ssoInvalidTicket')
      return
    }
    if (error instanceof ApiError && error.code === 'SSO_ACCOUNT_UNAVAILABLE') {
      await showFailure('auth.ssoAccountUnavailable')
      return
    }
    await showFailure('auth.ssoGenericFailure')
  }
}

onMounted(() => {
  void completeSsoLogin()
})
</script>

<template>
  <div class="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
    <div
      v-if="callbackStatus === 'exchanging'"
      role="status"
      aria-live="polite"
      class="flex flex-col items-center gap-4 py-4"
    >
      <div class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2 class="size-6 animate-spin" aria-hidden="true" />
      </div>
      <div>
        <h1 class="text-xl font-semibold text-foreground">
          {{ t('auth.ssoCallbackTitle') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t('auth.ssoExchanging') }}
        </p>
      </div>
    </div>

    <div v-else role="alert" class="flex flex-col items-center gap-4 py-4">
      <div
        class="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <CircleAlert class="size-6" aria-hidden="true" />
      </div>
      <div>
        <h1
          ref="failureHeading"
          tabindex="-1"
          class="text-xl font-semibold text-foreground outline-none"
        >
          {{ t('auth.ssoFailedTitle') }}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t(failureMessageKey) }}
        </p>
      </div>
      <Button as-child class="w-full">
        <RouterLink :to="{ name: 'login' }">
          {{ t('auth.ssoBackToLogin') }}
        </RouterLink>
      </Button>
    </div>
  </div>
</template>
