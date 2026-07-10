import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { defineConfig } from 'vite-plus'

// https://vite.dev/config/
export default defineConfig({
  // AI modified: lint/format via ESLint (@antfu); Oxfmt/Oxlint no longer used.
  staged: {
    // AI modified: lint-staged does not spawn through a shell, so avoid `CI=true ...`.
    '*': 'eslint --fix --cache',
  },
  plugins: [tailwindcss(), vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
})
