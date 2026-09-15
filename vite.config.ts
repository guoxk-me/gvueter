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
import { validateRuntimeConfig } from './src/config/runtime-config-schema.ts'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

function shouldBundleBrowserMocks(command: 'build' | 'serve', mode: string): boolean {
  const environment = loadEnv(mode, projectRoot, '')
  const mockSetting = process.env.VITE_ENABLE_MOCKS ?? environment.VITE_ENABLE_MOCKS
  if (mockSetting !== undefined && mockSetting !== 'true' && mockSetting !== 'false')
    throw new Error('VITE_ENABLE_MOCKS must be exactly "true" or "false".')
  return mockSetting === 'true' || (mockSetting === undefined && command === 'serve')
}

function getStrictBooleanSetting(
  environment: Record<string, string>,
  variableName: string,
  defaultValue: boolean,
): boolean {
  const setting = process.env[variableName] ?? environment[variableName]
  if (setting === undefined || setting === '')
    return defaultValue
  if (setting !== 'true' && setting !== 'false')
    throw new Error(`${variableName} must be exactly "true" or "false".`)
  return setting === 'true'
}

function getBasePath(environment: Record<string, string>): string {
  const basePath = process.env.VITE_BASE_PATH ?? environment.VITE_BASE_PATH ?? '/'
  if (!/^\/(?:[\w-]+\/)*$/.test(basePath))
    throw new Error('VITE_BASE_PATH must contain URL-safe path segments and end with "/".')
  return basePath
}

function escapeRegularExpression(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getLegacyRuntimeConfig(environment: Record<string, string>) {
  const notificationUrl = (
    process.env.VITE_NOTIFICATION_WS_URL
    ?? environment.VITE_NOTIFICATION_WS_URL
    ?? ''
  ).trim()

  return validateRuntimeConfig({
    schemaVersion: 1,
    api: {
      baseUrl: process.env.VITE_API_BASE_URL ?? environment.VITE_API_BASE_URL ?? '/api',
    },
    notifications: {
      // AI modified: the documented empty legacy value explicitly disables realtime notifications.
      url: notificationUrl || null,
      allowedOrigins: (
        process.env.VITE_NOTIFICATION_WS_ALLOWED_ORIGINS
        ?? environment.VITE_NOTIFICATION_WS_ALLOWED_ORIGINS
        ?? ''
      ).split(',').map(origin => origin.trim()).filter(Boolean),
    },
    navigation: {
      externalOrigins: (
        process.env.VITE_NAVIGATION_ALLOWED_ORIGINS
        ?? environment.VITE_NAVIGATION_ALLOWED_ORIGINS
        ?? ''
      ).split(',').map(origin => origin.trim()).filter(Boolean),
      iframeOrigins: (
        process.env.VITE_IFRAME_ALLOWED_ORIGINS
        ?? environment.VITE_IFRAME_ALLOWED_ORIGINS
        ?? ''
      ).split(',').map(origin => origin.trim()).filter(Boolean),
    },
  })
}

const pwaOptions: Partial<VitePWAOptions> = {
  disable: false,
  injectRegister: false,
  registerType: 'prompt',
  strategies: 'injectManifest',
  srcDir: 'src/features/pwa',
  filename: 'pwa-sw.ts',
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
  injectManifest: {
    globPatterns: ['**/*.{css,html,ico,js,png,svg,webp,woff2}'],
    globIgnores: ['**/mockServiceWorker.js'],
  },
  devOptions: {
    enabled: false,
  },
}

function browserRuntimeBoundary(): Plugin {
  let shouldBundleMocks = false
  let outputDirectory = resolve(projectRoot, 'dist')

  return {
    name: 'gvueter-browser-mock-boundary',
    config(_config, { command, mode }) {
      const environment = loadEnv(mode, projectRoot, '')
      shouldBundleMocks = shouldBundleBrowserMocks(command, mode)
      const shouldEnablePwa = getStrictBooleanSetting(environment, 'VITE_ENABLE_PWA', false)
      const shouldEnableLegacyConfig = getStrictBooleanSetting(
        environment,
        'VITE_RUNTIME_CONFIG_LEGACY',
        false,
      )
      if (shouldBundleMocks && shouldEnablePwa)
        throw new Error('VITE_ENABLE_MOCKS and VITE_ENABLE_PWA cannot both be true.')

      const basePath = getBasePath(environment)
      // AI modified: the PWA plugin resolves this shared option after the worker-mode boundary runs.
      pwaOptions.disable = !shouldEnablePwa
      if (pwaOptions.pwaAssets)
        pwaOptions.pwaAssets.disabled = !shouldEnablePwa
      if (pwaOptions.manifest) {
        pwaOptions.manifest.scope = basePath
        pwaOptions.manifest.start_url = basePath
      }
      if (pwaOptions.workbox) {
        const applicationPrefix = escapeRegularExpression(basePath)
        // AI modified: authentication navigations stay network-only under both root and subpath builds.
        pwaOptions.workbox.navigateFallbackDenylist = [
          /^\/api(?:\/|$)/,
          new RegExp(`^${applicationPrefix}(?:auth|oauth|oidc|sso)(?:/|$)`),
          new RegExp(`^${applicationPrefix}(?:login|forgot-password|reset-password)(?:/|$)`),
          new RegExp(`^${applicationPrefix}mockServiceWorker\\.js$`),
        ]
      }

      return {
        base: basePath,
        define: {
          __GVUETER_LEGACY_RUNTIME_CONFIG__: shouldEnableLegacyConfig
            ? JSON.stringify(getLegacyRuntimeConfig(environment))
            : 'undefined',
          __GVUETER_MOCKS_ENABLED__: JSON.stringify(shouldBundleMocks),
          __GVUETER_PWA_ENABLED__: JSON.stringify(shouldEnablePwa),
        },
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
    browserRuntimeBoundary(),
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
