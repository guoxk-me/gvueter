import type { Plugin } from 'vite'
import type { VitePWAOptions } from 'vite-plugin-pwa'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function shouldBundleBrowserMocks(command: 'build' | 'serve', mode: string): boolean {
  const environment = loadEnv(mode, projectRoot, '')
  const mockSetting = process.env.VITE_ENABLE_MOCKS ?? environment.VITE_ENABLE_MOCKS
  return mockSetting === 'true' || (mockSetting === undefined && command === 'serve')
}

const pwaOptions: Partial<VitePWAOptions> = {
  disable: false,
  injectRegister: false,
  registerType: 'prompt',
  filename: 'pwa-sw.js',
  includeAssets: ['favicon.ico'],
  pwaAssets: {
    // AI modified: one brand vector deterministically produces installable and maskable icon sizes.
    image: 'public/pwa-icon.svg',
    preset: 'minimal-2023',
    includeHtmlHeadLinks: true,
    overrideManifestIcons: true,
    injectThemeColor: false,
  },
  manifest: {
    name: 'Gvueter Admin',
    short_name: 'Gvueter',
    description: 'A production-oriented Vue administration workspace.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#18181b',
  },
  workbox: {
    cacheId: 'gvueter-pwa',
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: false,
    globPatterns: ['**/*.{css,html,ico,js,png,svg,webp,woff2}'],
    globIgnores: ['**/mockServiceWorker.js'],
    navigateFallback: 'index.html',
    // AI modified: authentication and owned API navigations must fail on the network, never reuse the app shell.
    navigateFallbackDenylist: [
      /^\/api(?:\/|$)/,
      /^\/(?:auth|oauth|oidc|sso)(?:\/|$)/,
      /^\/(?:login|forgot-password|reset-password)(?:\/|$)/,
      /^\/mockServiceWorker\.js$/,
    ],
    runtimeCaching: [
      {
        // AI modified: API and authentication responses are explicitly network-only and never enter Workbox caches.
        urlPattern: /\/(?:api|auth|oauth|oidc|sso)(?:\/|$)/,
        handler: 'NetworkOnly',
        method: 'GET',
      },
      {
        urlPattern: /\/mockServiceWorker\.js$/,
        handler: 'NetworkOnly',
        method: 'GET',
      },
    ],
  },
  devOptions: {
    enabled: false,
  },
}

function browserMockBoundary(): Plugin {
  let shouldBundleMocks = false
  let outputDirectory = resolve(projectRoot, 'dist')

  return {
    name: 'gvueter-browser-mock-boundary',
    config(_config, { command, mode }) {
      shouldBundleMocks = shouldBundleBrowserMocks(command, mode)
      // AI modified: the PWA plugin resolves this shared option after the worker-mode boundary runs.
      pwaOptions.disable = shouldBundleMocks
      if (pwaOptions.pwaAssets)
        pwaOptions.pwaAssets.disabled = shouldBundleMocks

      return {
        resolve: {
          alias: [
            {
              find: '@/mocks/browser',
              replacement: fileURLToPath(
                new URL(
                  shouldBundleMocks ? './src/mocks/browser.ts' : './src/mocks/browser-disabled.ts',
                  import.meta.url,
                ),
              ),
            },
            {
              find: '@',
              replacement: fileURLToPath(new URL('./src', import.meta.url)),
            },
          ],
        },
      }
    },
    configResolved(config) {
      outputDirectory = config.build.outDir
    },
    async closeBundle() {
      if (!shouldBundleMocks) {
        await rm(resolve(outputDirectory, 'mockServiceWorker.js'), { force: true })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // AI modified: production substitutes a typed no-op and removes the public worker after Vite copies it.
    browserMockBoundary(),
    // AI modified: Mock builds mutate `disable` before PWA options resolve, preventing root-scope conflicts.
    VitePWA(pwaOptions),
    // AI modified: the plugin graph now contains only tooling exercised by the Vue SFC source tree.
    tailwindcss(),
    AutoImport({
      imports: ['vue', 'vue-router', 'vue-i18n', '@vueuse/core'],
      dirs: ['./src/composables'],
      dts: './src/auto-imports.d.ts',
      viteOptimizeDeps: true,
    }),
    vue(),
    vueDevTools(),
  ],
  build: {
    // AI modified: the post-build gate reads emitted entry ownership instead of relying on file-name guesses.
    manifest: true,
    rolldownOptions: {
      output: {
        manualChunks(moduleId) {
          // AI modified: keep the Mock-only MSW runtime separate from application handlers under the async budget.
          if (
            moduleId.includes('/node_modules/msw/')
            || moduleId.includes('/node_modules/@mswjs/')
          ) {
            return 'mock-service-worker'
          }
        },
      },
    },
  },
})
