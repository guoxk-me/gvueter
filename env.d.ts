/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ENABLE_MOCKS?: 'true' | 'false'
  readonly VITE_NOTIFICATION_WS_URL?: string
  readonly VITE_NOTIFICATION_WS_ALLOWED_ORIGINS?: string
  readonly VITE_NAVIGATION_ALLOWED_ORIGINS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

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
