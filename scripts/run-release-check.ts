// @env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const pnpmCommand = process.env.npm_execpath ?? 'pnpm'
const pnpmShim = process.env.GVUETER_PNPM_SHIM

function runPnpm(arguments_: string[], environment: NodeJS.ProcessEnv = process.env): number {
  const executable = pnpmShim ? 'sh' : pnpmCommand
  const commandArguments = pnpmShim ? [pnpmShim, ...arguments_] : arguments_
  const command = spawnSync(executable, commandArguments, {
    env: environment,
    stdio: 'inherit',
  })
  return command.status ?? 1
}

let releaseStatus = runPnpm(['run', 'verify'])

if (releaseStatus === 0)
  releaseStatus = runPnpm(['run', 'test:e2e'], { ...process.env, CI: 'true' })

if (releaseStatus === 0) {
  releaseStatus = runPnpm(['run', 'build'], {
    ...process.env,
    VITE_BASE_PATH: '/admin/',
    VITE_ENABLE_PWA: 'true',
  })
}

if (releaseStatus === 0)
  releaseStatus = runPnpm(['run', 'test:e2e:pwa'], { ...process.env, CI: 'true' })

// AI modified: release verification restores a standard deployable artifact after every outcome.
const restoreStatus = runPnpm(['run', 'build'], {
  ...process.env,
  VITE_BASE_PATH: '/',
  VITE_ENABLE_PWA: 'false',
})
process.exitCode = releaseStatus || restoreStatus
