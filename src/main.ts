import type { RuntimeConfig } from './config/runtime-config-schema'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { loadRuntimeConfig, provideRuntimeConfig, RuntimeConfigError } from './config/runtime-config'
import { reconcileServiceWorkerMode } from './features/pwa/pwa-worker-boundary'
import { i18n } from './i18n'
import {
  installApplicationPreloadRecovery,
  reportApplicationFailure,
  showBootstrapRecovery,
  showRuntimeConfigRecovery,
} from './lib/application-recovery'
import { configureHttp } from './lib/http'
import { installGlobalErrorHandling } from './lib/observability'
import router from './router'
// AI modified: only Latin font assets are bundled; other scripts use the system fallback.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import './assets/css/main.css'

const uninstallPreloadRecovery = installApplicationPreloadRecovery()
if (import.meta.hot)
  import.meta.hot.dispose(uninstallPreloadRecovery)

let hasBootstrapped = false

export async function bootstrapApplication(runtimeConfig: RuntimeConfig): Promise<void> {
  if (hasBootstrapped)
    return

  configureHttp(runtimeConfig.api.baseUrl)
  // AI modified: a previous build's worker cannot control the new standalone skeleton.
  const shouldReload = await reconcileServiceWorkerMode(__GVUETER_PWA_ENABLED__ ? 'pwa' : 'none')
  if (shouldReload) {
    window.location.reload()
    return
  }

  const app = createApp(App)
  installGlobalErrorHandling(app)
  app.use(createPinia())
  app.use(i18n)
  app.use(router)
  app.use(VueQueryPlugin, { queryClient: new QueryClient() })
  provideRuntimeConfig(app, runtimeConfig)
  app.mount('#app')
  hasBootstrapped = true
}

async function startApplication(): Promise<void> {
  if (hasBootstrapped)
    return

  let runtimeConfig: RuntimeConfig
  try {
    runtimeConfig = await loadRuntimeConfig()
  }
  catch (failure: unknown) {
    const configFailure = failure instanceof RuntimeConfigError
      ? failure
      : new RuntimeConfigError('CONFIG_FETCH_FAILED')
    showRuntimeConfigRecovery({
      code: configFailure.code,
      configPath: `${import.meta.env.BASE_URL}runtime-config.json`,
      traceId: configFailure.traceId,
    }, startApplication)
    throw configFailure
  }

  try {
    await bootstrapApplication(runtimeConfig)
  }
  catch (failure: unknown) {
    reportApplicationFailure('bootstrap', failure)
    showBootstrapRecovery()
    throw failure
  }
}

void startApplication().catch(() => undefined)
