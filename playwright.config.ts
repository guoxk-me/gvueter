import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['line']] : [['list']],
  use: {
    baseURL: isCI ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173',
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(isCI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  outputDir: 'test-results',
  webServer: {
    command: isCI ? 'pnpm run preview --host 127.0.0.1' : 'pnpm run dev --host 127.0.0.1',
    port: isCI ? 4173 : 5173,
    reuseExistingServer: !isCI,
  },
})
