import antfu from '@antfu/eslint-config'

// AI modified: switched to @antfu/eslint-config; Oxfmt/Oxlint no longer used.
export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
    // AI modified: project only catalogs vite/vitest/vite-plus; do not force all deps into catalog.
    pnpm: false,
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/public/mockServiceWorker.js',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  {
    // AI modified: shadcn-vue primitives use single-word names and loose chart typings.
    files: ['src/components/ui/**/*.{vue,ts}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'ts/no-explicit-any': 'off',
    },
  },
)
