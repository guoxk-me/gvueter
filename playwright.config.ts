import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const visualRegressionSpecs = ['**/component-modules.spec.ts', '**/long-text-visual.spec.ts']

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  // AI modified: visual baselines are shared by local macOS and Linux CI Chromium runs.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
    // AI modified: repository screenshots share one bounded tolerance and deterministic animation policy.
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  // AI modified: a retry that passes still fails CI so intermittent regressions cannot be released.
  failOnFlakyTests: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: isCI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: isCI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
      ]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: isCI ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173',
    // AI modified: browser locale, timezone, and color preference cannot depend on the runner host.
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'Asia/Shanghai',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: isCI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',

    /* Only on CI systems run the tests headless */
    headless: isCI,
  },

  /* Keep local smoke tests deterministic; run expanded browser coverage in CI when browsers are provisioned. */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    ...(isCI
      ? [
          {
            name: 'firefox',
            // AI modified: geometry snapshots remain Chromium-owned while user flows run cross-browser.
            testIgnore: visualRegressionSpecs,
            // AI modified: Playwright Firefox cannot create an isMobile context used by this pointer-only case.
            grepInvert: [
              /keeps representative native and composite controls at least 44px on coarse pointers/,
              // AI modified: Firefox eagerly caches this route chunk; its portable preload recovery case still runs.
              /recovers visibly when a production lazy route chunk cannot load/,
            ],
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'webkit',
            testIgnore: visualRegressionSpecs,
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results',

  /* Run your local dev server before starting the tests */
  webServer: {
    /**
     * Use the dev server by default for faster feedback loop.
     * Use the preview server on CI for more realistic testing.
     * Playwright will re-use the local server if there is already a dev-server running.
     */
    command: isCI ? 'vp preview --host 127.0.0.1' : 'vp dev --host 127.0.0.1',
    port: isCI ? 4173 : 5173,
    // AI modified: CI owns an isolated preview process and never trusts a stale port occupant.
    reuseExistingServer: !isCI,
  },
})
