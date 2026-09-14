// @env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'

// AI modified: pnpm 12 is native on every platform; reuse the invoking executable instead of a Windows batch shim.
const pnpmCommand = process.env.npm_execpath ?? 'pnpm'

function runPnpm(arguments_: string[], environment: NodeJS.ProcessEnv = process.env): number {
  const command = spawnSync(pnpmCommand, arguments_, {
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
    VITE_ENABLE_MOCKS: 'true',
  })
}

if (releaseStatus === 0) {
  releaseStatus = runPnpm(['run', 'test:e2e'], {
    ...process.env,
    CI: 'true',
    VITE_ENABLE_MOCKS: 'true',
  })
}

// AI modified: every release attempt restores a deployable production dist, including failed browser runs.
const restoreStatus = runPnpm(['run', 'build'], {
  ...process.env,
  VITE_ENABLE_MOCKS: 'false',
})

if (releaseStatus === 0)
  releaseStatus = restoreStatus

process.exitCode = releaseStatus
