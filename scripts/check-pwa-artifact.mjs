import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const outputDirectory = resolve(import.meta.dirname, '..', 'dist')
const serviceWorkerPath = resolve(outputDirectory, 'pwa-sw.js')
const webManifestPath = resolve(outputDirectory, 'manifest.webmanifest')

async function exists(filePath) {
  return access(filePath).then(() => true, () => false)
}

const isPwaBuild = process.env.VITE_ENABLE_PWA === 'true'
const hasServiceWorker = await exists(serviceWorkerPath)
const hasWebManifest = await exists(webManifestPath)

if (!isPwaBuild) {
  if (hasServiceWorker || hasWebManifest)
    throw new Error('PWA-off builds must not emit an installable worker or manifest.')
  process.stdout.write('PWA-off artifact gate passed.\n')
  process.exit(0)
}

if (!hasServiceWorker || !hasWebManifest)
  throw new Error('PWA-on build is missing the worker or manifest.')

const manifest = JSON.parse(await readFile(webManifestPath, 'utf8'))
const basePath = process.env.VITE_BASE_PATH ?? '/'
if (manifest.scope !== basePath || manifest.start_url !== basePath)
  throw new Error('PWA manifest must use the configured Base path.')

const workerSource = await readFile(serviceWorkerPath, 'utf8')
if (!workerSource.includes('gvueter-pwa') || !workerSource.includes('runtime-config.json'))
  throw new Error('PWA worker must retain its cache namespace and network-only config boundary.')

// AI modified: release checks installability without retaining any Mock artifact requirement.
process.stdout.write('PWA-on artifact gate passed.\n')
