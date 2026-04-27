import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { abilitiesPlugin } from '@casl/vue'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { appAbility } from './lib/ability'
import { hydrateThemeColorEarly } from './composables/useThemeColor'
import './assets/css/main.css'

// 早期应用主题色，避免首屏色彩闪烁
hydrateThemeColorEarly()

async function bootstrap() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
  }

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.use(abilitiesPlugin, appAbility)

  app.mount('#app')
}

void bootstrap()
