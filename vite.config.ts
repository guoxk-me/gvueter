import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, projectRoot, '')
  const basePath = process.env.VITE_BASE_PATH ?? environment.VITE_BASE_PATH ?? '/'
  const pwaSetting = process.env.VITE_ENABLE_PWA ?? environment.VITE_ENABLE_PWA ?? 'false'

  if (!/^\/(?:[\w-]+\/)*$/.test(basePath))
    throw new Error('VITE_BASE_PATH must be an absolute URL-safe path ending with "/".')
  if (pwaSetting !== 'true' && pwaSetting !== 'false')
    throw new Error('VITE_ENABLE_PWA must be exactly "true" or "false".')

  const isPwaEnabled = pwaSetting === 'true'

  return {
    base: basePath,
    define: {
      __GVUETER_PWA_ENABLED__: JSON.stringify(isPwaEnabled),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      vue(),
      tailwindcss(),
      // AI modified: PWA remains an optional build capability without the removed Mock mode.
      VitePWA({
        disable: !isPwaEnabled,
        injectRegister: false,
        registerType: 'prompt',
        strategies: 'injectManifest',
        srcDir: 'src/features/pwa',
        filename: 'pwa-sw.ts',
        pwaAssets: {
          image: 'public/pwa-icon.svg',
          preset: 'minimal-2023',
          includeHtmlHeadLinks: true,
          overrideManifestIcons: true,
          injectThemeColor: false,
          disabled: !isPwaEnabled,
        },
        manifest: {
          name: 'Gvueter starter',
          short_name: 'Gvueter',
          description: 'A Vue frontend foundation.',
          start_url: basePath,
          scope: basePath,
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#ffffff',
        },
        injectManifest: {
          globPatterns: ['**/*.{css,html,ico,js,png,svg,webp,woff2}'],
          globIgnores: ['**/runtime-config.json'],
        },
        devOptions: { enabled: false },
      }),
    ],
    build: { manifest: true },
  }
})
