import type { Ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { computed, onMounted, onScopeDispose, shallowRef, watch } from 'vue'
import { reportFrontendError } from '@/lib/observability'
import { isPwaWorkerRegistration } from '../pwa-worker-boundary'

const UPDATE_INTERVAL_MS = 60 * 60 * 1_000

interface InstallChoice {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

export interface PwaLifecycle {
  canInstall: Readonly<Ref<boolean>>
  canUpdate: Readonly<Ref<boolean>>
  isInstalling: Readonly<Ref<boolean>>
  isUpdating: Readonly<Ref<boolean>>
  offlineReady: Ref<boolean>
  dismissInstall: () => void
  dismissUpdate: () => void
  installApplication: () => Promise<InstallChoice['outcome'] | undefined>
  updateApplication: () => Promise<void>
}

function isStandaloneApplication(): boolean {
  const standaloneNavigator = navigator as NavigatorWithStandalone
  return (
    (typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches)
    || standaloneNavigator.standalone === true
  )
}

export function usePwaLifecycle(): PwaLifecycle {
  const installPrompt = shallowRef<BeforeInstallPromptEvent>()
  const serviceWorkerRegistration = shallowRef<ServiceWorkerRegistration>()
  const isInstalled = shallowRef(isStandaloneApplication())
  const isInstallDismissed = shallowRef(false)
  const isUpdateDismissed = shallowRef(false)
  const isInstalling = shallowRef(false)
  const isUpdating = shallowRef(false)

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_serviceWorkerUrl, registration) => {
      // AI modified: resolve the worker by scope so a stale registration cannot control updates.
      serviceWorkerRegistration.value
        = registration && isPwaWorkerRegistration(registration) ? registration : undefined
    },
    onRegisterError: (failure: unknown) => {
      reportFrontendError('bootstrap', failure, {
        lifecycleInfo: 'pwa-service-worker-registration',
      })
    },
  })

  const canInstall = computed(
    () => Boolean(installPrompt.value) && !isInstalled.value && !isInstallDismissed.value,
  )
  const canUpdate = computed(() => needRefresh.value && !isUpdateDismissed.value)

  function receiveInstallPrompt(event: Event): void {
    if (isInstalled.value)
      return
    event.preventDefault()
    installPrompt.value = event as BeforeInstallPromptEvent
    isInstallDismissed.value = false
  }

  function confirmInstallation(): void {
    isInstalled.value = true
    installPrompt.value = undefined
  }

  async function checkForUpdate(): Promise<void> {
    if (!navigator.onLine || document.visibilityState === 'hidden')
      return

    try {
      await serviceWorkerRegistration.value?.update()
    }
    catch (failure: unknown) {
      reportFrontendError('bootstrap', failure, {
        lifecycleInfo: 'pwa-service-worker-update-check',
      })
    }
  }

  function checkVisibleApplication(): void {
    if (document.visibilityState === 'visible')
      void checkForUpdate()
  }

  function dismissInstall(): void {
    isInstallDismissed.value = true
  }

  function dismissUpdate(): void {
    isUpdateDismissed.value = true
  }

  async function installApplication(): Promise<InstallChoice['outcome'] | undefined> {
    const prompt = installPrompt.value
    if (!prompt || isInstalling.value)
      return undefined

    isInstalling.value = true
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      installPrompt.value = undefined
      return choice.outcome
    }
    finally {
      isInstalling.value = false
    }
  }

  async function updateApplication(): Promise<void> {
    if (isUpdating.value)
      return

    isUpdating.value = true
    try {
      await updateServiceWorker(true)
    }
    finally {
      isUpdating.value = false
    }
  }

  watch(needRefresh, (needsRefresh) => {
    if (!needsRefresh)
      isUpdateDismissed.value = false
  })

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', receiveInstallPrompt)
    window.addEventListener('appinstalled', confirmInstallation)
    window.addEventListener('online', checkForUpdate)
    document.addEventListener('visibilitychange', checkVisibleApplication)
  })

  const updateTimer = window.setInterval(() => void checkForUpdate(), UPDATE_INTERVAL_MS)

  onScopeDispose(() => {
    window.clearInterval(updateTimer)
    window.removeEventListener('beforeinstallprompt', receiveInstallPrompt)
    window.removeEventListener('appinstalled', confirmInstallation)
    window.removeEventListener('online', checkForUpdate)
    document.removeEventListener('visibilitychange', checkVisibleApplication)
  })

  return {
    canInstall,
    canUpdate,
    isInstalling,
    isUpdating,
    offlineReady,
    dismissInstall,
    dismissUpdate,
    installApplication,
    updateApplication,
  }
}
