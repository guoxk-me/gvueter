// @env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const pnpmCommand = process.env.npm_execpath ?? 'pnpm'
const pnpmShim = process.env.GVUETER_PNPM_SHIM

function runPnpm(arguments_: string[], environment: NodeJS.ProcessEnv = process.env): number {
  // AI modified: a locally installed shebang-less pnpm launcher can be selected without changing CI's native entry point.
  const executable = pnpmShim ? 'sh' : pnpmCommand
  const commandArguments = pnpmShim
    ? [pnpmShim, ...arguments_]
    : arguments_
  const command = spawnSync(executable, commandArguments, {
    env: environment,
    stdio: 'inherit',
  })

  if (command.error) {
    // AI modified: an invocation failure must still reach the final production restoration attempt.
    process.stderr.write('Cannot execute the pinned pnpm command.\n')
    return 1
  }
  return command.status ?? 1
}

let releaseStatus = runPnpm(['run', 'verify'])

if (releaseStatus === 0) {
  releaseStatus = runPnpm(['run', 'build'], {
    ...process.env,
    VITE_BASE_PATH: '/admin/',
    VITE_ENABLE_MOCKS: 'false',
    VITE_ENABLE_PWA: 'true',
  })
}

if (releaseStatus === 0) {
  // AI modified: Chromium validates the installable artifact before another build replaces dist.
  releaseStatus = runPnpm(['run', 'test:e2e:pwa'], {
    ...process.env,
    CI: 'true',
  })
}

if (releaseStatus === 0) {
  releaseStatus = runPnpm(['run', 'build'], {
    ...process.env,
    VITE_ENABLE_MOCKS: 'false',
    VITE_ENABLE_PWA: 'false',
    VITE_RUNTIME_CONFIG_LEGACY: 'true',
  })
}

if (releaseStatus === 0) {
  const invalidCombinationStatus = runPnpm(['run', 'build-only'], {
    ...process.env,
    VITE_ENABLE_MOCKS: 'true',
    VITE_ENABLE_PWA: 'true',
  })
  if (invalidCombinationStatus === 0) {
    process.stderr.write('Mock + PWA conflict gate unexpectedly succeeded.\n')
    releaseStatus = 1
  }
}

if (releaseStatus === 0) {
  // AI modified: Mock is the final successful build before Mock E2E, so Legacy verification cannot replace its assets.
  releaseStatus = runPnpm(['run', 'build'], {
    ...process.env,
    VITE_ENABLE_MOCKS: 'true',
    VITE_ENABLE_PWA: 'false',
  })
}

if (releaseStatus === 0) {
  releaseStatus = runPnpm(['run', 'test:e2e'], {
    ...process.env,
    CI: 'true',
    VITE_ENABLE_MOCKS: 'true',
    VITE_ENABLE_PWA: 'false',
  })
}

// AI modified: every release attempt restores a deployable production dist, including failed browser runs.
const restoreStatus = runPnpm(['run', 'build'], {
  ...process.env,
  VITE_ENABLE_MOCKS: 'false',
  VITE_ENABLE_PWA: 'false',
})

if (releaseStatus === 0)
  releaseStatus = restoreStatus

process.exitCode = releaseStatus
