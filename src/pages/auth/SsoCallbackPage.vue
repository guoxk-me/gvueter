<script setup lang="ts">
import { CircleAlert, Loader2 } from '@lucide/vue'
import { nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
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
const callbackStatus = shallowRef<'exchanging' | 'failed'>('exchanging')
const failureMessageKey = shallowRef('auth.ssoGenericFailure')
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
  <section class="space-y-6" aria-labelledby="sso-callback-heading">
    <p class="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
      {{ t('auth.organizationAccess') }}
    </p>

    <!-- AI modified: SSO completion keeps the same borderless recovery geometry as password flows. -->
    <div
      v-if="callbackStatus === 'exchanging'"
      role="status"
      aria-live="polite"
      aria-busy="true"
      class="flex items-start gap-4"
    >
      <div
        class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Loader2 class="size-5 animate-spin" />
      </div>
      <div class="min-w-0 pt-0.5">
        <h1
          id="sso-callback-heading"
          class="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-foreground"
        >
          {{ t('auth.ssoCallbackTitle') }}
        </h1>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">
          {{ t('auth.ssoExchanging') }}
        </p>
      </div>
    </div>

    <div v-else role="alert" class="space-y-6">
      <div class="flex items-start gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <CircleAlert class="size-5" />
        </div>
        <div class="min-w-0 pt-0.5">
          <h1
            id="sso-callback-heading"
            ref="failureHeading"
            tabindex="-1"
            class="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-foreground outline-none"
          >
            {{ t('auth.ssoFailedTitle') }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">
            {{ t(failureMessageKey) }}
          </p>
        </div>
      </div>
      <Button as-child size="lg" class="h-11 w-full sm:h-9">
        <RouterLink :to="{ name: 'login' }">
          {{ t('auth.ssoBackToLogin') }}
        </RouterLink>
      </Button>
    </div>
  </section>
</template>
