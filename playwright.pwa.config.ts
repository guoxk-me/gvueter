import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e-pwa',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  retries: 0,
  workers: 1,
  reporter: isCI ? [['line']] : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    locale: 'en-US',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-pwa',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // AI modified: PWA lifecycle evidence always runs against the already-built production artifact.
    command: 'pnpm run preview --host 127.0.0.1 --port 4174',
    env: { VITE_BASE_PATH: '/admin/' },
    port: 4174,
    reuseExistingServer: false,
  },
})
