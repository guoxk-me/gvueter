import { abilitiesPlugin } from '@casl/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import { startAppLocaleSync } from './composables/useLocaleToggle'
import { hydrateThemeColorEarly, useThemeColor } from './composables/useThemeColor'
import { reconcileServiceWorkerMode } from './features/pwa/pwa-worker-boundary'
import { i18n } from './i18n'
import { appAbility } from './lib/ability'
import {
  installApplicationPreloadRecovery,
  reportApplicationFailure,
  showBootstrapRecovery,
} from './lib/application-recovery'
import { installGlobalErrorHandling } from './lib/observability'
import { registerSessionStateBoundary } from './lib/session-state-boundary'
import router from './router'
import { useAppearanceStore } from './stores/appearance'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './assets/css/main.css'

// AI modified: stale lazy assets are captured before asynchronous bootstrap work can begin.
const uninstallPreloadRecovery = installApplicationPreloadRecovery()
if (import.meta.hot) import.meta.hot.dispose(uninstallPreloadRecovery)

async function bootstrap() {
  // 早期应用主题色，避免首屏色彩闪烁
  hydrateThemeColorEarly()

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  })

  const mockSetting = import.meta.env.VITE_ENABLE_MOCKS
  // AI modified: an explicit flag wins, while an omitted flag keeps local development convenient.
  const shouldEnableMocks =
    mockSetting === 'true' || (mockSetting === undefined && import.meta.env.DEV)

  // AI modified: remove a previously active root-scoped worker before switching between Mock and PWA modes.
  const shouldReloadForWorkerBoundary = await reconcileServiceWorkerMode(
    shouldEnableMocks ? 'mock' : import.meta.env.PROD ? 'pwa' : 'none',
  )
  if (shouldReloadForWorkerBoundary) {
    window.location.reload()
    return
  }

  // AI modified: demo/CI preview builds can opt into the same MSW contract as local development.
  if (shouldEnableMocks) {
    const { startBrowserMocking } = await import('@/mocks/browser')
    await startBrowserMocking()
  }

  const app = createApp(App)
  const pinia = createPinia().use(piniaPluginPersistedstate)

  // AI modified: capture render and unhandled Promise failures before plugins or routing can fail.
  installGlobalErrorHandling(app)

  app.use(pinia)
  app.use(i18n)

  // AI modified: register principal-scoped cache cleanup before routing restores a session.
  registerSessionStateBoundary({ pinia, queryClient })

  // AI modified: hydrate Pinia first, then keep every AppSettings DOM/i18n projection live before routing.
  const appearance = useAppearanceStore(pinia)
  useThemeColor()
  startAppLocaleSync(appearance)

  app.use(router)
  app.use(abilitiesPlugin, appAbility)
  app.use(VueQueryPlugin, { queryClient })

  app.mount('#app')
}

void bootstrap().catch((failure: unknown) => {
  // AI modified: startup failures render a plugin-independent recovery surface instead of an empty root.
  reportApplicationFailure('bootstrap', failure)
  showBootstrapRecovery()
})
