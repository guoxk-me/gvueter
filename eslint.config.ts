import antfu from '@antfu/eslint-config'

// AI modified: keep @antfu/eslint-config minimal — vue/typescript/pnpm only.
export default antfu(
  {
    // AI modified: Oxfmt is the single formatter; ESLint keeps semantic Vue/TypeScript/project checks.
    ignores: ['public/mockServiceWorker.js', 'src/auto-imports.d.ts'],
    stylistic: false,
    vue: true,
    typescript: true,
    pnpm: true,
  },
  {
    name: 'gvueter/oxfmt-formatting-ownership',
    rules: {
      // AI modified: formatting-equivalent rules defer to vp fmt so required gates cannot rewrite each other.
      'style/arrow-parens': 'off',
      'style/brace-style': 'off',
      'style/member-delimiter-style': 'off',
      'style/operator-linebreak': 'off',
      'unicorn/number-literal-case': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    name: 'gvueter/oxfmt-vue-formatting-ownership',
    rules: {
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
).override('antfu/pnpm/pnpm-workspace-yaml', {
  rules: {
    // AI modified: keep the pnpm rule active while enforcing the setting compatible with the frozen lockfile.
    'pnpm/yaml-enforce-settings': ['error', { settings: { shellEmulator: true } }],
  },
})
