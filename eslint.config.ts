import antfu from '@antfu/eslint-config'

// AI modified: ESLint now owns both repository formatting and semantic checks.
export default antfu(
  {
    ignores: ['public/mockServiceWorker.js', 'src/auto-imports.d.ts'],
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
    },
    vue: true,
    typescript: true,
    pnpm: true,
  },
).override('antfu/pnpm/pnpm-workspace-yaml', {
  rules: {
    // AI modified: keep the pnpm rule active while enforcing the setting compatible with the frozen lockfile.
    'pnpm/yaml-enforce-settings': ['error', { settings: { shellEmulator: true } }],
  },
})
