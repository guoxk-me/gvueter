/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ENABLE_MOCKS?: 'true' | 'false'
  readonly VITE_ENABLE_PWA?: 'true' | 'false'
  readonly VITE_IFRAME_ALLOWED_ORIGINS?: string
  readonly VITE_NOTIFICATION_WS_URL?: string
  readonly VITE_NOTIFICATION_WS_ALLOWED_ORIGINS?: string
  readonly VITE_NAVIGATION_ALLOWED_ORIGINS?: string
  readonly VITE_RUNTIME_CONFIG_LEGACY?: 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __GVUETER_LEGACY_RUNTIME_CONFIG__:
  | import('@/config/runtime-config-schema').RuntimeConfig
  | undefined
declare const __GVUETER_MOCKS_ENABLED__: boolean
declare const __GVUETER_PWA_ENABLED__: boolean

// AI modified: keep deployment configuration typed instead of scattering string casts.

declare module 'nprogress' {
  interface NProgressOptions {
    barSelector?: string
    minimum?: number
    showSpinner?: boolean
    template?: string
    trickleSpeed?: number
  }

  interface NProgressApi {
    configure: (options: NProgressOptions) => NProgressApi
    start: () => NProgressApi
    done: (force?: boolean) => NProgressApi
  }

  const nprogress: NProgressApi
  export default nprogress
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<object, object, unknown>
  export default component
}
