import antfu from '@antfu/eslint-config'

// AI modified: keep @antfu/eslint-config minimal — vue/typescript/pnpm only.
export default antfu(
  {
    vue: true,
    typescript: true,
    pnpm: true,
  },
  {
    rules: {
      // AI modified: trustPolicy:no-downgrade blocks installs with current lockfile.
      'pnpm/yaml-enforce-settings': 'off',
    },
  },
)
