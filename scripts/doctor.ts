// @env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as {
  packageManager: string
  engines: { node: string }
}
const requiredFiles = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.env.example',
  'components.json',
  'public/runtime-config.json',
  'container/entrypoint.sh',
]
const missingFiles = requiredFiles.filter(fileName => !existsSync(resolve(projectRoot, fileName)))
const nodeVersion = process.versions.node.split('.').map(Number)
const isSupportedNode = nodeVersion[0] === 24 && (nodeVersion[1] ?? 0) >= 18
const expectedPnpm = manifest.packageManager.replace(/^pnpm@/, '')
const installedPnpm = execFileSync(process.env.npm_execpath ?? 'pnpm', ['--version'], {
  encoding: 'utf8',
}).trim()

if (missingFiles.length > 0 || !isSupportedNode || installedPnpm !== expectedPnpm) {
  throw new Error(`Toolchain mismatch: missing=${missingFiles.join(',')}, node=${
    process.version}, pnpm=${installedPnpm}`)
}

// AI modified: CI validates the retained toolchain without referring to deleted business modes.
process.stdout.write(`Toolchain doctor passed: ${manifest.engines.node}, pnpm ${expectedPnpm}.\n`)
