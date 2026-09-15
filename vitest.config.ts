import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // AI modified: dedicated Playwright PWA specs must not be collected as Vitest unit suites.
      exclude: [...configDefaults.exclude, 'e2e/**', 'e2e-pwa/**'],
      setupFiles: ['./vitest.setup.ts'],
      globals: true,
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov', 'json-summary'],
        // AI modified: an explicit source glob makes completely untested production files count as zero.
        include: ['src/**/*.{ts,vue}'],
        exclude: [
          'src/**/*.d.ts',
          'src/**/__tests__/**',
          'src/**/types.ts',
          'src/i18n/locales/**',
          'src/mocks/**',
          'src/types/**',
        ],
        // AI modified: official Vitest's V8 remapping recalibrates the measured whole-source line baseline.
        thresholds: {
          statements: 74,
          branches: 66,
          functions: 67,
          lines: 74,
        },
      },
    },
  }),
)
